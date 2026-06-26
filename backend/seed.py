"""XLegal — Seed data inicial para Paraguay
Crea: Super Admin, Tenant Demo, Normas Jurídicas, Plantillas de Escritos
"""
import asyncio, uuid, sys, os
from datetime import datetime, timezone, timedelta
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

SUPER_ADMIN_EMAIL = "xabiercarrillo@gmail.com"
CONTACT_PHONE = "0993397400"


async def seed():
    from app.core.database import AsyncSessionLocal, engine, Base, create_tenant_schema
    from app.core.security import hash_password
    from app.core.config import settings
    from app.models.tenant import Tenant
    from app.models.user import User, UserRole
    from app.models.library import LegalNorm
    from app.models.template import WritingTemplate
    from sqlalchemy import select

    # Crear todas las tablas
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # ── Verificar si ya fue sembrado ──────────────────────────────────
        result = await db.execute(select(User).where(User.email == SUPER_ADMIN_EMAIL))
        if result.scalar_one_or_none():
            print("  ℹ️  Ya sembrado anteriormente — saltando")
            return

        print("🌱 Iniciando seed XLegal Paraguay...")
        now = datetime.now(timezone.utc)

        # ── DEMO TENANT id (el super admin opera este estudio además del acceso global) ──
        demo_schema = "t_demo_xlegal_001"
        demo_tenant_id = str(uuid.uuid4())

        # ── SUPER ADMIN (acceso global + opera el estudio demo) ───────────
        super_admin = User(
            id=str(uuid.uuid4()),
            tenant_id=demo_tenant_id,
            email=SUPER_ADMIN_EMAIL,
            hashed_password=hash_password("XLegal"),
            full_name="Super Admin XLegal",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
        db.add(super_admin)
        print(f"  ✅ Super Admin: {SUPER_ADMIN_EMAIL} / XLegal")

        # ── DEMO TENANT ───────────────────────────────────────────────────
        demo_tenant = Tenant(
            id=demo_tenant_id,
            name="Estudio Jurídico XLegal Demo",
            legal_name="Estudio Jurídico XLegal Demo S.R.L.",
            ruc="80012345-6",
            timbrado="12345678",
            timbrado_expires="2025-12-31",
            address="Av. Mariscal López 1234, Piso 5",
            city="Asunción",
            phone=f"+595 {CONTACT_PHONE}",
            email="info@xlegal.com.py",
            whatsapp=CONTACT_PHONE,
            admin_name="Administrador XLegal",
            admin_email=settings.FIRST_SUPERUSER_EMAIL,
            admin_phone=CONTACT_PHONE,
            plan="bufete_m",
            db_schema=demo_schema,
            is_active=True,
            payment_status="active",
            subscription_started_at=now.strftime("%Y-%m-%d"),
            last_payment_at=now.strftime("%Y-%m-%d"),
            next_payment_at=(now + timedelta(days=30)).strftime("%Y-%m-%d"),
            invoice_counter=1,
            notes=f"Tenant demo — XLegal Paraguay. Tel: {CONTACT_PHONE}",
        )
        db.add(demo_tenant)
        await db.flush()

        # ── USUARIOS DEMO ─────────────────────────────────────────────────
        admin = User(
            id=str(uuid.uuid4()),
            tenant_id=demo_tenant_id,
            email=settings.FIRST_SUPERUSER_EMAIL,
            hashed_password=hash_password(settings.FIRST_SUPERUSER_PASSWORD),
            full_name="Administrador XLegal",
            role=UserRole.FIRM_ADMIN,
            is_active=True,
        )
        db.add(admin)

        abogado = User(
            id=str(uuid.uuid4()),
            tenant_id=demo_tenant_id,
            email="abogado@demo.com.py",
            hashed_password=hash_password("Demo2024!"),
            full_name="Dr. Carlos Martínez",
            role=UserRole.LAWYER,
            bar_number="CAP-1234",
            phone="+595 981 234-567",
            specialties="Derecho Civil, Derecho Laboral",
            is_active=True,
        )
        db.add(abogado)
        print(f"  ✅ Admin: {settings.FIRST_SUPERUSER_EMAIL} / {settings.FIRST_SUPERUSER_PASSWORD}")
        print(f"  ✅ Demo:  abogado@demo.com.py / Demo2024!")

        # ── NORMAS JURÍDICAS PARAGUAYAS ───────────────────────────────────
        norms = [
            ("CN",      "codigo",     "constitucional",  "Constitución Nacional del Paraguay",               "Ley suprema de la República del Paraguay (1992). Base de todos los derechos y garantías."),
            ("CC",      "codigo",     "civil",            "Código Civil (Ley Nº 1183/85)",                    "Norma las relaciones civiles. Prescripción general 10 años (Art. 659). Bienal: honorarios, alquileres (Art. 656)."),
            ("CPC",     "codigo",     "civil",            "Código Procesal Civil (Ley Nº 1337/88)",           "Proceso ordinario: traslado 18 días hábiles (Art. 133). Apelación 5 días (Art. 397). Prescripción 2 años honorarios."),
            ("CP",      "codigo",     "penal",            "Código Penal (Ley Nº 1160/97)",                    "Normas penales sustantivas de Paraguay. Sistema acusatorio junto con CPP Ley 1286/98."),
            ("CPP",     "codigo",     "penal",            "Código Procesal Penal (Ley Nº 1286/98)",           "Art 5: Presunción de inocencia. Art 131: Plazo razonable. Etapa investigativa, intermedia y juicio oral."),
            ("CLab",    "codigo",     "laboral",          "Código del Trabajo (Ley Nº 213/93)",               "Art 87 Preaviso 30/45/60 días · Art 92 Indemnización 15 días/año · Art 219 Vacaciones · Art 243 Aguinaldo. Salario mínimo 2024: ₲ 2.680.373."),
            ("IPS",     "ley",        "laboral",          "Ley 98/92 — Instituto de Previsión Social",        "Empleado aporta 9%, empleador 14%. Beneficios: jubilación, asistencia médica, subsidios."),
            ("CNA",     "codigo",     "familia",          "Código de la Niñez y la Adolescencia (Ley Nº 1680/01)", "Protección integral de niños, niñas y adolescentes. Tribunal de la Niñez competente."),
            ("LSC",     "ley",        "comercial",        "Ley de Sociedades Comerciales (Ley Nº 1034/83)",   "SA, SRL, SCS. SRL: 2-25 socios. Registro DNCR. SA debe publicar en Diario Oficial."),
            ("LGB",     "ley",        "bancario",         "Ley General de Bancos (Ley Nº 861/96)",            "Entidades bancarias y financieras en Paraguay. Supervisión BCP."),
            ("LMA",     "ley",        "mediacion",        "Ley de Mediación y Arbitraje (Ley Nº 5060/13)",    "Medios alternativos de resolución de conflictos. Mediación prejudicial y judicial."),
            ("CT",      "ley",        "tributario",       "Código Tributario (Ley Nº 125/91)",                "Normas tributarias fundamentales. IVA 10% general, 5% bienes básicos. Timbrado SET."),
            ("IRE",     "ley",        "tributario",       "Ley de Modernización Tributaria (Ley Nº 6380/19)", "IRE: 10% para empresas. IRP: profesionales >36 salarios mínimos (Gs. 96.493.428 en 2024)."),
            ("LFD",     "ley",        "digital",          "Ley de Firma Digital (Ley Nº 4868/13)",            "Comercio electrónico y firma digital en Paraguay. Validez legal de documentos electrónicos."),
            ("LPI",     "ley",        "comercial",        "Ley de Propiedad Industrial (Ley Nº 1294/98)",     "Marcas, patentes y derechos de propiedad industrial. Registro en DINAPI."),
            ("CA",      "codigo",     "aduanero",         "Código Aduanero (Ley Nº 2422/04)",                 "Ingreso y egreso de mercaderías al territorio nacional. DNA - Dirección Nacional de Aduanas."),
            ("LOM",     "ley",        "administrativo",   "Ley Orgánica Municipal (Ley Nº 3966/10)",          "Organización y funcionamiento de los municipios paraguayos."),
            ("LCP",     "ley",        "administrativo",   "Ley de Contrataciones Públicas (Ley Nº 2051/03)",  "Adquisición de bienes y servicios por el Estado paraguayo. DNCP."),
            ("LDC",     "ley",        "comercial",        "Ley de Defensa del Consumidor (Ley Nº 1334/98)",   "Protección de consumidores y usuarios en Paraguay. SEDECO."),
            ("SMIN24",  "resolucion", "laboral",          "Resolución MJT/2024 — Salario Mínimo 2024",        "Salario mínimo: ₲ 2.680.373. Base de cálculo para liquidaciones, IPS, indemnizaciones y prestaciones sociales."),
        ]
        norm_objs = []
        for code, category, area, title, summary in norms:
            norm_objs.append(LegalNorm(
                id=str(uuid.uuid4()),
                code=code, category=category, area=area,
                title=title, summary=summary,
                is_active=True,
            ))
        db.add_all(norm_objs)
        print(f"  ✅ {len(norm_objs)} normas jurídicas paraguayas")

        # ── PLANTILLAS DE ESCRITOS ────────────────────────────────────────
        templates = [
            ("Demanda Civil Ordinaria", "demanda", "civil", "Modelo de demanda ordinaria de cobro (CPC Ley 1337/88).",
             "SEÑOR JUEZ DE PRIMERA INSTANCIA EN LO CIVIL\n\n[ACTOR], C.I. N° [CI], domicilio en [DOMICILIO], ante V.S. DIGO:\n\nI. OBJETO\nDemanda ordinaria contra [DEMANDADO] por [CAUSA] - Gs. [MONTO].\n\nII. HECHOS\n[Narrar hechos cronológicamente]\n\nIII. DERECHO\nArts. 101 y ss. CPC. Arts. 659 y ss. Código Civil.\n\nIV. PETITORIO\n1. Admitir la demanda.\n2. Correr traslado por 18 días hábiles (Art. 133 CPC).\n3. En definitiva, condenar al pago de Gs. [MONTO] más intereses y costas.\n\n[CIUDAD], [FECHA]\n[Abog. NOMBRE — Mat. CAP N° XXXX]"),

            ("Demanda Laboral — Despido Injustificado", "demanda", "laboral", "Demanda laboral con liquidación (Ley 213/93).",
             "SEÑOR JUEZ LABORAL\n\n[ACTOR], trabajador/a, C.I. N° [CI], ante V.S. DIGO:\n\nI. OBJETO\nDemanda laboral contra [EMPRESA], RUC [RUC], por despido injustificado:\n- Indemnización (Art. 92):  Gs. [MONTO]\n- Preaviso (Art. 87):        Gs. [MONTO]\n- Vacaciones (Art. 219):    Gs. [MONTO]\n- Aguinaldo (Art. 243):     Gs. [MONTO]\nTOTAL RECLAMADO:            Gs. [TOTAL]\n\nII. HECHOS\nIngreso: [FECHA]. Cargo: [CARGO]. Salario: Gs. [SALARIO]/mes.\nDespido injustificado: [FECHA_DESPIDO].\n\nIII. DERECHO\nArts. 87, 92, 219, 243 Código del Trabajo Ley 213/93.\n\nIV. PETITORIO\nCondenar a [EMPRESA] al pago de Gs. [TOTAL] más intereses y costas.\n\n[Abog. NOMBRE — Mat. CAP N° XXXX]"),

            ("Liquidación Laboral — Ley 213/93", "contrato", "laboral", "Acta de liquidación laboral para firma del trabajador.",
             "ACTA DE LIQUIDACIÓN LABORAL\n\nEmpleador: [EMPRESA]  RUC: [RUC]\nTrabajador: [NOMBRE]   C.I.: [CI]\nCargo: [CARGO]\nFecha ingreso: [FECHA_INGRESO]  |  Fecha egreso: [FECHA_EGRESO]\nCausa de egreso: [CAUSA]\nSalario mensual: Gs. [SALARIO]\n\n──────────────────────────────────\nPREAVISO (Art. 87 CLab):          Gs. [PREAVISO]\nINDEMNIZACIÓN (Art. 92 CLab):    Gs. [INDEMNIZACION]\nVACACIONES PROP. (Art. 219):      Gs. [VACACIONES]\nAGUINALDO PROP. (Art. 243):      Gs. [AGUINALDO]\nSALARIO PENDIENTE:                Gs. [SAL_PENDIENTE]\n──────────────────────────────────\nSUBTOTAL BRUTO:                   Gs. [BRUTO]\nMenos IPS trabajador (9%):       -Gs. [IPS]\n──────────────────────────────────\nTOTAL NETO A COBRAR:              Gs. [TOTAL_NETO]\n──────────────────────────────────\n\n[CIUDAD], [FECHA]\n\n_________________________    _________________________\n[EMPLEADOR / REPRESENTANTE]  [TRABAJADOR — C.I. XXXX]"),

            ("Recurso de Apelación — Civil", "recurso", "civil", "Recurso de apelación (5 días — Art. 397 CPC).",
             "EXCMA. CÁMARA DE APELACIONES EN LO CIVIL\n\n[APELANTE], en autos '[CARATULA]', Exp. N° [NUM], ante V.E. DIGO:\n\nI. RECURSO\nEn tiempo hábil (5 días — Art. 397 CPC), apelo la S.D. N° [NUM]\ndictada el [FECHA] por el [JUZGADO].\n\nII. AGRAVIOS\n1. Error en la apreciación de la prueba:\n   [Desarrollar el agravio]\n\n2. Errónea aplicación del derecho:\n   [Desarrollar el agravio]\n\nIII. PETITORIO\nElevar los autos al Superior Tribunal, y en definitiva:\nRevocar la sentencia y [PETICION_ORIGINAL], con imposición de costas.\n\n[Abog. NOMBRE — Mat. CAP N° XXXX]"),

            ("Habeas Corpus", "recurso", "constitucional", "Acción de Habeas Corpus (Art. 133 CN).",
             "EXCMO. TRIBUNAL DE APELACIONES EN LO PENAL\n\n[ABOGADO], Mat. CAP N° [MAT], C.I. [CI], interpone\nHABEAS CORPUS en favor de [DETENIDO], C.I. [CI_DETENIDO]:\n\nI. OBJETO\nDetención ILEGAL en [LUGAR] desde [FECHA_DETENCION], sin orden judicial.\n\nII. FUNDAMENTO JURÍDICO\nArt. 133 CN — Art. 131 CPP — Derecho a la libertad.\n\nIII. PETITORIO\nOrdenar la INMEDIATA LIBERACIÓN de [DETENIDO].\n\n[CIUDAD], [FECHA]\n[Abog. NOMBRE — Mat. CAP N° XXXX]"),

            ("Contrato de Honorarios Profesionales", "contrato", "civil", "Contrato de locación de servicios entre abogado y cliente.",
             "CONTRATO DE LOCACIÓN DE SERVICIOS PROFESIONALES\n\nEn [CIUDAD], a [FECHA]:\n\nEL PROFESIONAL: Abog. [NOMBRE], Mat. CAP N° [MAT], C.I. [CI].\nEL CLIENTE: [NOMBRE_CLIENTE], C.I./RUC [ID], domicilio [DOMICILIO].\n\nCLÁUSULA 1 — OBJETO\nAsesoramiento y representación en: [DESCRIPCION_ASUNTO].\n\nCLÁUSULA 2 — HONORARIOS\nGs. [MONTO] con IVA 10% incluido.\nForma de pago: [CUOTAS / AL_EXITO / MENSUAL].\n\nCLÁUSULA 3 — GASTOS PROCESALES\nGastos de arancel, copias y peritajes a cargo del Cliente.\n\nCLÁUSULA 4 — DURACIÓN\nHasta la finalización del asunto encomendado.\n\nCLÁUSULA 5 — JURISDICCIÓN\nTribunales de [CIUDAD], República del Paraguay.\n\n_________________________    _________________________\nAbog. [NOMBRE]                [CLIENTE — C.I. XXXX]"),

            ("Contrato de Arrendamiento", "contrato", "civil", "Contrato de arrendamiento de inmueble urbano.",
             "CONTRATO DE ARRENDAMIENTO DE INMUEBLE\n\nEn [CIUDAD], a [FECHA]:\n\nARRENDADOR: [NOMBRE], C.I. [CI].\nARRENDATARIO: [NOMBRE], C.I. [CI].\n\n1. INMUEBLE: [DIRECCION_COMPLETA]\n2. PLAZO: desde [FECHA_INICIO] hasta [FECHA_FIN]\n3. CANON MENSUAL: Gs. [CANON]\n4. DEPÓSITO: Gs. [DEPOSITO] (equivalente a [MESES] mes/es)\n5. DESTINO: [USO — residencial / comercial]\n6. MEJORAS: No se admiten sin autorización escrita.\n7. SERVICIOS: A cargo del arrendatario.\n8. PRÓRROGA: Automática por igual período salvo aviso 30 días.\n\n[CIUDAD], [FECHA]\n\n_________________________    _________________________\n[ARRENDADOR — C.I. XXXX]     [ARRENDATARIO — C.I. XXXX]"),

            ("Poder General", "notarial", "civil", "Instrumento de mandato general para representación legal.",
             "PODER GENERAL\n\nYo, [PODERDANTE], C.I. N° [CI], mayor de edad, domicilio en\n[DOMICILIO], por medio del presente instrumento OTORGO\nPODER GENERAL AMPLIO a:\n\n[APODERADO], C.I. N° [CI_APODERADO], abogado/a, Mat. CAP N° [MAT],\npara que en mi nombre y representación pueda:\n\n1. Comparecer ante toda clase de Juzgados y Tribunales.\n2. Demandar, contestar, reconvenir, allanarse y transigir.\n3. Celebrar contratos, cobrar y recibir.\n4. [FACULTADES_ADICIONALES]\n\nDoy por bueno todo cuanto haga el apoderado dentro de los\ntérminos de este mandato.\n\n[CIUDAD], [FECHA]\n_________________________\n[PODERDANTE — C.I. XXXX]"),

            ("Acta de Mediación — Ley 5060/13", "contrato", "mediacion", "Acta final de proceso de mediación extrajudicial.",
             "ACTA DE MEDIACIÓN EXTRAJUDICIAL\n(Ley N° 5060/13 — Art. 17)\n\nCentro de Mediación: [CENTRO]\nMediador/a habilitado/a: [MEDIADOR], Reg. N° [NUM]\nFecha: [FECHA]   Lugar: [LUGAR]\n\nPARTE A: [NOMBRE], C.I. [CI]\nPARTE B: [NOMBRE], C.I. [CI]\nMateria: [MATERIA_EN_DISPUTA]\n\nRESULTADO: ✓ ACUERDO / ✗ SIN ACUERDO\n\nTÉRMINOS DEL ACUERDO:\n[Describir los términos acordados]\n\nEfecto: Este acuerdo tiene fuerza de título ejecutivo\n(Art. 17 Ley 5060/13).\n\n_________________________    _________________________\n[PARTE A — C.I. XXXX]        [PARTE B — C.I. XXXX]\n\n_________________________\n[MEDIADOR/A — Reg. N° XXXX]"),

            ("Contestación de Demanda", "recurso", "civil", "Escrito de contestación de demanda civil.",
             "SEÑOR JUEZ DE PRIMERA INSTANCIA EN LO CIVIL\n\n[DEMANDADO], C.I. [CI], representado por Abog. [ABOGADO],\nMat. CAP N° [MAT], en autos '[CARATULA]' CONTESTA LA DEMANDA:\n\nI. EXCEPCIONES PREVIAS (si corresponde)\n- [EXCEPCION] (Art. [NUM] CPC)\n\nII. CONTESTACIÓN AL FONDO\nNIEGO todos los hechos no reconocidos expresamente.\n\nRESPONDO a cada hecho:\n1. [Respuesta al hecho 1]\n2. [Respuesta al hecho 2]\n\nIII. PRUEBAS\nDocumental: [listar]\nTestimonial: [listar]\n\nIV. PETITORIO\n1. Rechazar la demanda en todas sus partes.\n2. Imponer costas al actor.\n\n[Abog. NOMBRE — Mat. CAP N° XXXX]"),
        ]
        tpl_objs = []
        for title, category, area, description, content in templates:
            tpl_objs.append(WritingTemplate(
                id=str(uuid.uuid4()),
                tenant_id=None,
                title=title, category=category, area=area,
                description=description, content=content,
                is_public=True, is_active=True, use_count=0,
            ))
        db.add_all(tpl_objs)
        print(f"  ✅ {len(tpl_objs)} plantillas de escritos")

        await db.commit()

        # Crear schema PostgreSQL para el tenant demo
        await create_tenant_schema(demo_schema)
        print(f"  ✅ Schema PostgreSQL: {demo_schema}")

    print("\n🎉 Seed completado — XLegal Paraguay v2.0.0")
    print(f"   🔑 Super Admin:   {SUPER_ADMIN_EMAIL} / XLegal")
    print(f"   🔑 Firm Admin:    {settings.FIRST_SUPERUSER_EMAIL} / {settings.FIRST_SUPERUSER_PASSWORD}")
    print(f"   🔑 Demo Lawyer:   abogado@demo.com.py / Demo2024!")
    print(f"   📞 Soporte:       {CONTACT_PHONE}")
    print(f"   🌐 App:           https://app.xlegal.com.py")


if __name__ == "__main__":
    asyncio.run(seed())
