"""
XLegal — Geolocalización y Mapas
Google Maps: juzgados, tribunales, direcciones de clientes
Mapbox: alternativa con mejor pricing
HERE Technologies: buena cobertura en Latinoamérica
"""
import httpx
from app.core.config import settings

# Juzgados y Tribunales pre-cargados de Paraguay
TRIBUNALES_PARAGUAY = [
    {"name": "Palacio de Justicia (Central)", "address": "Independencia Nacional y Haedo, Asunción", "lat": -25.2867, "lng": -57.6478, "city": "Asunción", "type": "civil"},
    {"name": "Juzgado Penal de Garantías", "address": "Gral. Santos y Haedo, Asunción", "lat": -25.2875, "lng": -57.6490, "city": "Asunción", "type": "penal"},
    {"name": "Tribunal de Apelaciones Civil y Comercial", "address": "Estrella y Alberdi, Asunción", "lat": -25.2855, "lng": -57.6460, "city": "Asunción", "type": "apelaciones"},
    {"name": "Juzgado de Trabajo Asunción", "address": "Herrera y Manuel Domínguez, Asunción", "lat": -25.2900, "lng": -57.6510, "city": "Asunción", "type": "laboral"},
    {"name": "Defensoría del Pueblo", "address": "Presidente Franco 780, Asunción", "lat": -25.2885, "lng": -57.6445, "city": "Asunción", "type": "defensoría"},
    {"name": "Fiscalía General del Estado", "address": "Chile 1033, Asunción", "lat": -25.2821, "lng": -57.6403, "city": "Asunción", "type": "fiscalía"},
    {"name": "Corte Suprema de Justicia", "address": "Alberdi y Oliva, Asunción", "lat": -25.2853, "lng": -57.6442, "city": "Asunción", "type": "suprema"},
    {"name": "Registro Público de Comercio (DNCR)", "address": "Haedo 496, Asunción", "lat": -25.2870, "lng": -57.6483, "city": "Asunción", "type": "registro"},
    {"name": "Dirección Nacional de Migraciones", "address": "Luis A. Herrera 3470, Asunción", "lat": -25.3106, "lng": -57.6319, "city": "Asunción", "type": "migraciones"},
    {"name": "SET — Asunción Central", "address": "Chile 1072, Asunción", "lat": -25.2820, "lng": -57.6402, "city": "Asunción", "type": "tributario"},
    {"name": "Juzgado de Paz de Luque", "address": "Mcal. López e Independencia, Luque", "lat": -25.2658, "lng": -57.4885, "city": "Luque", "type": "paz"},
    {"name": "Juzgado de San Lorenzo", "address": "Av. Mcal. López 3010, San Lorenzo", "lat": -25.3329, "lng": -57.5181, "city": "San Lorenzo", "type": "civil"},
    {"name": "Juzgado de Lambaré", "address": "Mcal. Estigarribia 890, Lambaré", "lat": -25.3464, "lng": -57.6289, "city": "Lambaré", "type": "civil"},
    {"name": "Juzgado de Ciudades del Este", "address": "Av. Adrián Jara, Ciudad del Este", "lat": -25.5108, "lng": -54.6143, "city": "Ciudad del Este", "type": "civil"},
    {"name": "Juzgado de Encarnación", "address": "Mcal. Estigarribia 1780, Encarnación", "lat": -27.3351, "lng": -55.8667, "city": "Encarnación", "type": "civil"},
]


class GoogleMapsService:
    """Google Maps Platform API."""
    BASE = "https://maps.googleapis.com/maps/api"

    async def geocode(self, address: str, api_key: str = None) -> dict:
        """Convierte dirección en coordenadas."""
        key = api_key or settings.GOOGLE_MAPS_API_KEY
        if not key:
            return {"success": False, "error": "GOOGLE_MAPS_API_KEY no configurada"}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    f"{self.BASE}/geocode/json",
                    params={"address": f"{address}, Paraguay", "key": key, "language": "es"},
                )
                data = r.json()
                if data.get("results"):
                    loc = data["results"][0]["geometry"]["location"]
                    return {
                        "success": True,
                        "lat": loc["lat"],
                        "lng": loc["lng"],
                        "formatted_address": data["results"][0]["formatted_address"],
                    }
                return {"success": False, "error": "Sin resultados"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def places_search(self, query: str, lat: float, lng: float,
                             radius: int = 5000, api_key: str = None) -> list:
        """Busca lugares cercanos (ej: juzgados próximos)."""
        key = api_key or settings.GOOGLE_MAPS_API_KEY
        if not key:
            return []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    f"{self.BASE}/place/textsearch/json",
                    params={"query": query, "location": f"{lat},{lng}", "radius": radius, "key": key, "language": "es"},
                )
                return r.json().get("results", [])
        except Exception:
            return []

    async def directions(self, origin: str, destination: str, mode: str = "driving", api_key: str = None) -> dict:
        """Cómo llegar de un punto a otro."""
        key = api_key or settings.GOOGLE_MAPS_API_KEY
        if not key:
            return {"success": False, "error": "GOOGLE_MAPS_API_KEY no configurada"}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    f"{self.BASE}/directions/json",
                    params={"origin": origin, "destination": destination, "mode": mode,
                            "language": "es", "region": "py", "key": key},
                )
                data = r.json()
                if data.get("routes"):
                    route = data["routes"][0]["legs"][0]
                    return {
                        "success": True,
                        "distance": route["distance"]["text"],
                        "duration": route["duration"]["text"],
                        "start_address": route["start_address"],
                        "end_address": route["end_address"],
                        "steps": [s["html_instructions"] for s in route["steps"][:8]],
                    }
                return {"success": False, "error": data.get("status", "Sin ruta")}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def static_map_url(self, lat: float, lng: float, zoom: int = 15, size: str = "600x400",
                        api_key: str = None) -> str:
        """URL de imagen estática de mapa."""
        key = api_key or settings.GOOGLE_MAPS_API_KEY
        marker = f"color:red|{lat},{lng}"
        return (f"{self.BASE}/staticmap?center={lat},{lng}&zoom={zoom}&size={size}"
                f"&markers={marker}&key={key}&language=es")

    def embed_url(self, query: str, api_key: str = None) -> str:
        """URL para iframe embed de Google Maps."""
        key = api_key or settings.GOOGLE_MAPS_API_KEY
        import urllib.parse
        return f"https://www.google.com/maps/embed/v1/place?q={urllib.parse.quote(query)}&key={key}&language=es"


class MapboxService:
    """Mapbox API — alternativa con buen pricing para Latinoamérica."""
    BASE = "https://api.mapbox.com"

    async def geocode(self, address: str, token: str = None) -> dict:
        tk = token or settings.MAPBOX_TOKEN
        if not tk:
            return {"success": False, "error": "MAPBOX_TOKEN no configurado"}
        import urllib.parse
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    f"{self.BASE}/geocoding/v5/mapbox.places/{urllib.parse.quote(address)}.json",
                    params={"access_token": tk, "country": "py", "language": "es", "limit": 1},
                )
                data = r.json()
                if data.get("features"):
                    feat = data["features"][0]
                    coords = feat["center"]
                    return {"success": True, "lng": coords[0], "lat": coords[1],
                            "place_name": feat["place_name"]}
                return {"success": False, "error": "Sin resultados"}
        except Exception as e:
            return {"success": False, "error": str(e)}


google_maps = GoogleMapsService()
mapbox = MapboxService()


def get_tribunales(city: str = None, tipo: str = None) -> list:
    """Retorna lista de tribunales con filtros opcionales."""
    data = TRIBUNALES_PARAGUAY
    if city:
        data = [t for t in data if t["city"].lower() == city.lower()]
    if tipo:
        data = [t for t in data if t["type"] == tipo]
    return data
