"""
XLegal — API de Mapas y Geolocalización
GET /maps/tribunales          → Lista de juzgados y tribunales de PY
GET /maps/geocode             → Geocodificar dirección
GET /maps/directions          → Cómo llegar
GET /maps/nearby-tribunales   → Tribunales cercanos
GET /maps/static              → URL de mapa estático
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.integration import TenantIntegration
from app.services.maps import google_maps, mapbox, get_tribunales

router = APIRouter(prefix="/maps", tags=["maps"])


async def _get_maps_key(db, tenant_id: str) -> str | None:
    r = await db.execute(select(TenantIntegration).where(
        TenantIntegration.tenant_id == tenant_id,
        TenantIntegration.provider == "google_maps",
        TenantIntegration.is_enabled == True,
    ))
    i = r.scalar_one_or_none()
    if i:
        return (i.config or {}).get("api_key")
    return settings.GOOGLE_MAPS_API_KEY or None


@router.get("/tribunales")
async def list_tribunales(
    city: str = Query(None, description="Filtrar por ciudad"),
    tipo: str = Query(None, description="Filtrar por tipo: civil, penal, laboral, apelaciones, fiscalía..."),
):
    """
    Lista de juzgados y tribunales de Paraguay pre-cargados.
    No requiere API key — datos internos XLegal.
    """
    data = get_tribunales(city=city, tipo=tipo)
    return {
        "total": len(data),
        "items": data,
        "cities": list({t["city"] for t in get_tribunales()}),
        "tipos": list({t["type"] for t in get_tribunales()}),
    }


@router.get("/geocode")
async def geocode_address(
    address: str = Query(..., description="Dirección a geocodificar"),
    provider: str = Query("google", description="google | mapbox"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Convierte dirección en coordenadas (lat, lng)."""
    if provider == "mapbox":
        token = settings.MAPBOX_TOKEN
        return await mapbox.geocode(address, token=token)
    else:
        api_key = await _get_maps_key(db, current_user.tenant_id)
        return await google_maps.geocode(address, api_key=api_key)


@router.get("/directions")
async def get_directions(
    origin: str = Query(..., description="Punto de partida"),
    destination: str = Query(..., description="Destino"),
    mode: str = Query("driving", description="driving | walking | transit"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtiene indicaciones de ruta entre dos puntos en Paraguay."""
    api_key = await _get_maps_key(db, current_user.tenant_id)
    if not api_key:
        return {
            "success": False,
            "error": "Google Maps no configurado. Ir a Integraciones → Mapas → Google Maps.",
            "google_maps_url": f"https://www.google.com/maps/dir/{origin}/{destination}",
        }
    return await google_maps.directions(origin, destination, mode=mode, api_key=api_key)


@router.get("/nearby-tribunales")
async def nearby_tribunales(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(10.0, description="Radio de búsqueda en km"),
):
    """Encuentra los tribunales más cercanos a una coordenada dada."""
    import math
    def distance(lat1, lng1, lat2, lng2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
        return R * 2 * math.asin(math.sqrt(a))

    all_t = get_tribunales()
    nearby = []
    for t in all_t:
        d = distance(lat, lng, t["lat"], t["lng"])
        if d <= radius_km:
            nearby.append({**t, "distance_km": round(d, 2)})

    nearby.sort(key=lambda x: x["distance_km"])
    return {"total": len(nearby), "items": nearby, "center": {"lat": lat, "lng": lng}, "radius_km": radius_km}


@router.get("/static")
async def static_map(
    lat: float = Query(...),
    lng: float = Query(...),
    zoom: int = Query(15),
    size: str = Query("600x400"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna URL de imagen estática de Google Maps."""
    api_key = await _get_maps_key(db, current_user.tenant_id)
    if not api_key:
        return {"url": None, "error": "Google Maps API key no configurada"}
    url = google_maps.static_map_url(lat, lng, zoom=zoom, size=size, api_key=api_key)
    return {"url": url}


@router.get("/embed")
async def embed_map(
    query: str = Query(..., description="Lugar a mostrar en el mapa"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """URL de iframe para embeber Google Maps."""
    api_key = await _get_maps_key(db, current_user.tenant_id)
    if not api_key:
        import urllib.parse
        return {"url": f"https://www.google.com/maps/search/{urllib.parse.quote(query)}", "type": "fallback"}
    url = google_maps.embed_url(query, api_key=api_key)
    return {"url": url, "type": "embed"}
