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
    from app.models.client import Client
    from app.models.case import Case, CaseStatus, CasePriority
    from app.models.hearing import Hearing
    from app.models.deadline import Deadline
    from app.models.task import Task
    from app.models.appointment import Appointment
    from app.models.billing import Income, Expense, Invoice, InvoiceItem
    from app.models.contact import ProfessionalContact
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

        # ── DATOS DEMO (estudio en marcha) ────────────────────────────────
        TID = demo_tenant_id
        ab = abogado.id
        ad = admin.id
        def dd(days):  # fecha (YYYY-MM-DD)
            return (now + timedelta(days=days)).strftime("%Y-%m-%d")
        def dt(days, hour=9, minute=0):  # datetime ISO para scheduled_at
            return (now + timedelta(days=days)).strftime(f"%Y-%m-%dT{hour:02d}:{minute:02d}:00")

        # Clientes
        cli = [
            Client(id=str(uuid.uuid4()), tenant_id=TID, type="individual", full_name="María Benítez Rolón", document_type="ci", document_number="3456789", email="mbenitez@gmail.com", phone="0981 456 789", whatsapp="0981456789", city="Asunción", address="Barrio Las Mercedes, Asunción"),
            Client(id=str(uuid.uuid4()), tenant_id=TID, type="company", full_name="Comercial del Este S.A.", document_type="ruc", ruc="80034521-7", document_number="80034521", email="contacto@comercialeste.com.py", phone="021 445 887", city="Ciudad del Este", address="Av. Monseñor Rodríguez 1450"),
            Client(id=str(uuid.uuid4()), tenant_id=TID, type="individual", full_name="José Cardozo Giménez", document_type="ci", document_number="2987654", email="jcardozo@hotmail.com", phone="0985 221 340", city="Luque"),
            Client(id=str(uuid.uuid4()), tenant_id=TID, type="company", full_name="Constructora Paraná S.R.L.", document_type="ruc", ruc="80019876-3", document_number="80019876", email="admin@constructoraparana.com.py", phone="021 612 009", city="Asunción", address="Av. Aviadores del Chaco 2050"),
            Client(id=str(uuid.uuid4()), tenant_id=TID, type="individual", full_name="Rosa Mareco de Villalba", document_type="ci", document_number="1654320", email="rmareco@gmail.com", phone="0971 880 145", city="San Lorenzo"),
            Client(id=str(uuid.uuid4()), tenant_id=TID, type="individual", full_name="Hugo Acosta Benítez", document_type="ci", document_number="4123567", email="hacosta@gmail.com", phone="0982 334 210", city="Capiatá"),
        ]
        db.add_all(cli)
        await db.flush()

        # Casos
        cs = [
            Case(id=str(uuid.uuid4()), tenant_id=TID, reference="EXP-2026-0001", title="Benítez c/ Comercial del Este s/ Cobro de Guaraníes", matter="civil", status=CaseStatus.ACTIVE, priority=CasePriority.HIGH, client_id=cli[0].id, lawyer_id=ab, court="Juzgado Civil y Comercial 3º Turno", court_file_number="1.234/2026", opposing_party="Comercial del Este S.A.", agreed_fee=15000000, opened_at=dd(-40), description="Cobro de guaraníes por incumplimiento contractual de provisión de mercaderías."),
            Case(id=str(uuid.uuid4()), tenant_id=TID, reference="EXP-2026-0002", title="Sucesión Ramírez Villalba", matter="sucesiones", status=CaseStatus.INVESTIGATION, priority=CasePriority.MEDIUM, client_id=cli[4].id, lawyer_id=ab, court="Juzgado en lo Civil 1º Turno", court_file_number="876/2026", opened_at=dd(-25), description="Juicio sucesorio intestado. Declaratoria de herederos."),
            Case(id=str(uuid.uuid4()), tenant_id=TID, reference="EXP-2026-0003", title="Acosta c/ Constructora Paraná s/ Despido Injustificado", matter="laboral", status=CaseStatus.TRIAL, priority=CasePriority.URGENT, client_id=cli[5].id, lawyer_id=ab, court="Juzgado Laboral 2º Turno", court_file_number="445/2026", opposing_party="Constructora Paraná S.R.L.", agreed_fee=8000000, opened_at=dd(-60), description="Demanda laboral por despido injustificado. Liquidación Ley 213/93."),
            Case(id=str(uuid.uuid4()), tenant_id=TID, reference="EXP-2026-0004", title="Cardozo s/ Divorcio Vincular", matter="familia", status=CaseStatus.NEGOTIATION, priority=CasePriority.MEDIUM, client_id=cli[2].id, lawyer_id=ab, court="Juzgado de la Niñez 1º Turno", opened_at=dd(-15), description="Divorcio vincular por presentación conjunta. Régimen de relacionamiento."),
            Case(id=str(uuid.uuid4()), tenant_id=TID, reference="EXP-2026-0005", title="Constructora Paraná c/ Municipalidad s/ Contencioso", matter="administrativo", status=CaseStatus.NEW, priority=CasePriority.LOW, client_id=cli[3].id, lawyer_id=ab, opened_at=dd(-5), description="Recurso contencioso administrativo contra resolución municipal."),
            Case(id=str(uuid.uuid4()), tenant_id=TID, reference="EXP-2025-0188", title="Mareco s/ Usucapión", matter="civil", status=CaseStatus.CLOSED_WON, priority=CasePriority.MEDIUM, client_id=cli[4].id, lawyer_id=ab, court="Juzgado Civil 4º Turno", agreed_fee=12000000, opened_at=dd(-200), description="Prescripción adquisitiva de dominio. Sentencia favorable."),
        ]
        db.add_all(cs)
        await db.flush()

        # Audiencias próximas
        db.add_all([
            Hearing(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[0].id, lawyer_id=ab, type="conciliacion", status="programada", title="Audiencia de conciliación - Benítez c/ Comercial del Este", scheduled_at=dt(3, 8, 30), court="Juzgado Civil y Comercial 3º Turno", room="Sala 2", judge="Dra. Liliana Ortiz"),
            Hearing(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[2].id, lawyer_id=ab, type="juicio_oral", status="programada", title="Audiencia de vista de causa - Acosta laboral", scheduled_at=dt(6, 10, 0), court="Juzgado Laboral 2º Turno", room="Sala 1", judge="Dr. Ramón Espínola"),
            Hearing(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[1].id, lawyer_id=ab, type="ordinaria", status="programada", title="Apertura de causa sucesoria - Ramírez Villalba", scheduled_at=dt(12, 9, 0), court="Juzgado Civil 1º Turno", judge="Dra. Mónica Báez"),
            Hearing(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[3].id, lawyer_id=ab, type="ordinaria", status="programada", title="Ratificación de convenio - Divorcio Cardozo", scheduled_at=dt(18, 11, 0), court="Juzgado de la Niñez 1º Turno"),
        ])

        # Plazos
        db.add_all([
            Deadline(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[2].id, lawyer_id=ab, title="Vencimiento plazo para ofrecer pruebas", type="procesal", priority="urgent", due_date=dd(2), legal_basis="Art. 245 CPT"),
            Deadline(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[0].id, lawyer_id=ab, title="Contestar traslado de la demanda", type="procesal", priority="high", due_date=dd(5), legal_basis="Art. 133 CPC (18 días hábiles)"),
            Deadline(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[4].id, lawyer_id=ab, title="Interponer recurso de apelación", type="procesal", priority="high", due_date=dd(8), legal_basis="Art. 397 CPC (5 días)"),
            Deadline(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[1].id, lawyer_id=ab, title="Presentar inventario de bienes", type="procesal", priority="medium", due_date=dd(20)),
            Deadline(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[5].id, lawyer_id=ab, title="Inscripción de sentencia en Registro Público", type="administrativo", priority="low", due_date=dd(-10), is_completed=True, completed_at=dd(-12)),
        ])

        # Tareas
        db.add_all([
            Task(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[0].id, assigned_to=ab, created_by=ad, title="Redactar escrito de contestación de demanda", status="pendiente", priority="high", due_date=dd(4)),
            Task(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[2].id, assigned_to=ab, created_by=ad, title="Preparar liquidación laboral Ley 213/93", status="en_proceso", priority="urgent", due_date=dd(1)),
            Task(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[1].id, assigned_to=ab, created_by=ad, title="Solicitar certificado de defunción y partidas", status="pendiente", priority="medium", due_date=dd(7)),
            Task(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[3].id, assigned_to=ab, created_by=ad, title="Reunión con cliente para firma de convenio", status="pendiente", priority="medium", due_date=dd(2)),
            Task(id=str(uuid.uuid4()), tenant_id=TID, assigned_to=ab, created_by=ad, title="Renovar timbrado ante la SET", status="pendiente", priority="low", due_date=dd(15)),
            Task(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[5].id, assigned_to=ab, created_by=ad, title="Archivar expediente concluido", status="completada", priority="low"),
        ])

        # Citas
        db.add_all([
            Appointment(id=str(uuid.uuid4()), tenant_id=TID, client_id=cli[0].id, case_id=cs[0].id, lawyer_id=ab, type="seguimiento", status="programada", title="Seguimiento de caso - María Benítez", scheduled_at=dt(1, 15, 0), location="Oficina - Av. Mcal. López 1234", fee=0),
            Appointment(id=str(uuid.uuid4()), tenant_id=TID, client_id=cli[5].id, case_id=cs[2].id, lawyer_id=ab, type="consulta_inicial", status="programada", title="Consulta - Hugo Acosta", scheduled_at=dt(2, 9, 30), location="Oficina", fee=150000),
            Appointment(id=str(uuid.uuid4()), tenant_id=TID, client_id=cli[3].id, lawyer_id=ab, type="reunion", status="programada", title="Reunión Constructora Paraná", scheduled_at=dt(4, 16, 0), location="Videollamada Zoom"),
            Appointment(id=str(uuid.uuid4()), tenant_id=TID, client_id=cli[2].id, case_id=cs[3].id, lawyer_id=ab, type="firma", status="programada", title="Firma de convenio de divorcio", scheduled_at=dt(8, 10, 0), location="Oficina"),
        ])

        # Ingresos (created_at = ahora → cuentan para el mes)
        db.add_all([
            Income(id=str(uuid.uuid4()), tenant_id=TID, client_id=cli[0].id, case_id=cs[0].id, description="Anticipo de honorarios - Caso Benítez", amount=5000000, income_date=dd(-2), category="honorarios", payment_method="transferencia", lawyer_id=ab),
            Income(id=str(uuid.uuid4()), tenant_id=TID, client_id=cli[5].id, case_id=cs[2].id, description="Honorarios consulta laboral", amount=150000, income_date=dd(-1), category="honorarios", payment_method="efectivo", lawyer_id=ab),
            Income(id=str(uuid.uuid4()), tenant_id=TID, client_id=cli[4].id, case_id=cs[5].id, description="Honorarios por usucapión (éxito)", amount=12000000, income_date=dd(-6), category="honorarios", payment_method="transferencia", lawyer_id=ab),
            Income(id=str(uuid.uuid4()), tenant_id=TID, client_id=cli[3].id, description="Iguala mensual Constructora Paraná", amount=3000000, income_date=dd(-9), category="iguala", payment_method="transferencia", lawyer_id=ab),
        ])

        # Gastos
        db.add_all([
            Expense(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[0].id, description="Tasa judicial y aranceles", amount=450000, expense_date=dd(-3), category="judicial", is_reimbursable=True),
            Expense(id=str(uuid.uuid4()), tenant_id=TID, description="Alquiler de oficina", amount=2500000, expense_date=dd(-5), category="oficina"),
            Expense(id=str(uuid.uuid4()), tenant_id=TID, case_id=cs[2].id, description="Honorarios de perito contable", amount=1200000, expense_date=dd(-4), category="peritos", is_reimbursable=True),
            Expense(id=str(uuid.uuid4()), tenant_id=TID, description="Servicios (luz, internet, agua)", amount=680000, expense_date=dd(-6), category="servicios"),
        ])

        # Facturas
        inv1_id = str(uuid.uuid4())
        inv1 = Invoice(id=inv1_id, tenant_id=TID, client_id=cli[0].id, case_id=cs[0].id, invoice_type="B", number="001-001-0000123", timbrado="12345678", status="cobrada", subtotal=4545455, iva_rate=10, iva_amount=454545, total=5000000, paid_amount=5000000, balance=0, issued_at=dd(-2), paid_at=dd(-1))
        inv2_id = str(uuid.uuid4())
        inv2 = Invoice(id=inv2_id, tenant_id=TID, client_id=cli[3].id, invoice_type="B", number="001-001-0000124", timbrado="12345678", status="emitida", subtotal=2727273, iva_rate=10, iva_amount=272727, total=3000000, balance=3000000, issued_at=dd(-9), due_date=dd(6))
        inv3_id = str(uuid.uuid4())
        inv3 = Invoice(id=inv3_id, tenant_id=TID, client_id=cli[1].id, invoice_type="B", number="001-001-0000125", timbrado="12345678", status="vencida", subtotal=9090909, iva_rate=10, iva_amount=909091, total=10000000, balance=10000000, issued_at=dd(-45), due_date=dd(-15))
        db.add_all([inv1, inv2, inv3])
        await db.flush()
        db.add_all([
            InvoiceItem(id=str(uuid.uuid4()), invoice_id=inv1_id, description="Anticipo de honorarios profesionales", quantity=1, unit_price=5000000, amount=5000000),
            InvoiceItem(id=str(uuid.uuid4()), invoice_id=inv2_id, description="Iguala mensual de asesoría", quantity=1, unit_price=3000000, amount=3000000),
            InvoiceItem(id=str(uuid.uuid4()), invoice_id=inv3_id, description="Honorarios juicio de cobro", quantity=1, unit_price=10000000, amount=10000000),
        ])

        # Contactos profesionales
        db.add_all([
            ProfessionalContact(id=str(uuid.uuid4()), tenant_id=TID, name="Dra. Liliana Ortiz", type="juez", specialty="Civil y Comercial", court="Juzgado Civil y Comercial 3º Turno", phone="021 445 100", is_favorite=True),
            ProfessionalContact(id=str(uuid.uuid4()), tenant_id=TID, name="Dr. Ramón Espínola", type="juez", specialty="Laboral", court="Juzgado Laboral 2º Turno", phone="021 445 220"),
            ProfessionalContact(id=str(uuid.uuid4()), tenant_id=TID, name="Lic. Andrés Florentín", type="perito", specialty="Perito Contador", phone="0981 553 410", email="aflorentin@peritos.com.py", is_favorite=True),
            ProfessionalContact(id=str(uuid.uuid4()), tenant_id=TID, name="Esc. Patricia Ayala", type="notario", specialty="Escribana Pública", address="Estrella 765, Asunción", phone="021 490 332"),
            ProfessionalContact(id=str(uuid.uuid4()), tenant_id=TID, name="Dr. Marcos Riveros", type="colega", specialty="Derecho Penal", phone="0985 110 887", email="mriveros@abogados.com.py"),
        ])

        print("  ✅ Datos demo: 6 clientes, 6 casos, 4 audiencias, 5 plazos, 6 tareas, 4 citas, 4 ingresos, 4 gastos, 3 facturas, 5 contactos")

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
