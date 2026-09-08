from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from catalogos.catalogos_model import Catalogo, TIPOS_CATALOGO


async def listar_catalogos_action(db: AsyncSession, solo_activos: bool = False) -> list[Catalogo]:
    query = select(Catalogo).order_by(Catalogo.tipo, Catalogo.valor)
    if solo_activos:
        query = query.where(Catalogo.activo.is_not(False))
    result = await db.execute(query)
    return list(result.scalars().all())


async def crear_catalogo_action(db: AsyncSession, data: dict) -> Catalogo:
    tipo = (data.get("tipo") or "").strip()
    valor = (data.get("valor") or "").strip()

    if tipo not in TIPOS_CATALOGO:
        raise HTTPException(status_code=400, detail=f"Tipo inválido: {tipo}")
    if not valor:
        raise HTTPException(status_code=400, detail="El valor no puede estar vacío")

    duplicado = await db.execute(
        select(Catalogo).where(
            Catalogo.tipo == tipo,
            func.lower(Catalogo.valor) == valor.lower(),
        )
    )
    if duplicado.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ese valor ya existe en el catálogo")

    item = Catalogo(tipo=tipo, valor=valor, activo=True)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def actualizar_catalogo_action(db: AsyncSession, item_id: int, data: dict) -> Catalogo | None:
    item = await db.get(Catalogo, item_id)
    if not item:
        return None

    if data.get("valor") is not None:
        valor = data["valor"].strip()
        if not valor:
            raise HTTPException(status_code=400, detail="El valor no puede estar vacío")
        duplicado = await db.execute(
            select(Catalogo).where(
                Catalogo.tipo == item.tipo,
                func.lower(Catalogo.valor) == valor.lower(),
                Catalogo.id != item.id,
            )
        )
        if duplicado.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Ese valor ya existe en el catálogo")
        item.valor = valor

    if data.get("activo") is not None:
        item.activo = data["activo"]

    await db.commit()
    await db.refresh(item)
    return item


async def eliminar_catalogo_action(db: AsyncSession, item_id: int) -> bool:
    item = await db.get(Catalogo, item_id)
    if not item:
        return False
    await db.delete(item)
    await db.commit()
    return True


PREGRADOS = [
    "Administración de Empresas",
    "Arquitectura",
    "Ciencia de Datos",
    "Ciencia Política y Gobierno",
    "Comunicación Social y Periodismo",
    "Contaduría Pública",
    "Derecho",
    "Diseño Gráfico",
    "Diseño Industrial",
    "Economía",
    "Enfermería",
    "Filosofía y Humanidades",
    "Geología",
    "Ingeniería Civil",
    "Ingeniería de Sistemas",
    "Ingeniería Eléctrica",
    "Ingeniería Electrónica",
    "Ingeniería Industrial",
    "Ingeniería Mecánica",
    "Matemáticas",
    "Medicina",
    "Música",
    "Negocios Internacionales",
    "Odontología",
    "Psicología",
    "Relaciones Internacionales",
]

POSGRADOS = [
    "Especialización en Dirección Estratégica Empresarial",
    "Especialización en Finanzas",
    "Especialización en Gerencia de Empresas Comerciales",
    "Especialización en Negociación y Manejo de Conflictos",
    "Especialización en Valoración de Bienes",
    "Especialización en Transformación Digital",
    "Especialización en Gerencia Ambiental",
    "Especialización en Gerencia de la Calidad",
    "Especialización en Gerencia de la Calidad y Auditoría en Salud",
    "Especialización en Gerencia de Servicios de Salud",
    "Especialización en Gerencia Pública",
    "Especialización en Gerencia de Proyectos",
    "Especialización en Diseño y Evaluación de Proyectos",
    "Especialización en Logística Empresarial",
    "Especialización en Logística del Transporte Internacional de Mercancías",
    "Especialización en Seguridad y Salud en el Trabajo",
    "Especialización en Análisis y Diseño de Estructuras",
    "Especialización en Ingeniería de Procesos Industriales",
    "Especialización en Ingeniería del Software",
    "Especialización en Arqueología",
    "Especialización en Psicología Forense",
    "Especialización en Derecho Administrativo",
    "Especialización en Derecho Ambiental, Territorial y Urbanístico",
    "Especialización en Derecho Civil y de Familia",
    "Especialización en Derecho Comercial",
    "Especialización en Derecho Constitucional",
    "Especialización en Derecho Contractual",
    "Especialización en Derecho de Sociedades",
    "Especialización en Derecho Laboral",
    "Especialización en Derecho Penal",
    "Especialización en Derecho Público",
    "Especialización en Derechos Humanos",
    "Especialización en Gobierno y Políticas Públicas",
    "Especialización en Responsabilidad y Seguros",
    "Especialización en Tributación",
    "Especialización en Enfermería del Cuidado Crítico Adulto",
    "Especialización en Enfermería del Cuidado Neonatal",
    "Especialización en Dermatología",
    "Especialización en Medicina Familiar",
    "Especialización en Medicina Interna",
    "Especialización en Neonatología",
    "Especialización en Radiología e Imágenes Diagnósticas",
    "Especialización en Oftalmología",
    "Especialización en Psiquiatría",
    "Especialización en Pediatría",
    "Especialización en Desarrollo Social",
    "Especialización en Desarrollo Familiar",
    "Maestría en Administración de Empresas - MBA",
    "Maestría en Economía",
    "Maestría en Finanzas",
    "Maestría en Ingeniería Administrativa",
    "Maestría en Negociación y Manejo de Conflictos",
    "Maestría en Relaciones Internacionales",
    "Maestría en Cooperación Internacional y Gestión de Proyectos",
    "Maestría en Sistemas Integrados de Gestión",
    "Maestría en Relaciones Públicas",
    "Maestría en Analítica de Datos",
    "Maestría en Estadística Aplicada",
    "Maestría en Matemáticas",
    "Maestría en Ingeniería Industrial",
    "Maestría en Ingeniería Mecánica",
    "Maestría en Ingeniería de Sistemas y Computación",
    "Maestría en Ingeniería Civil",
    "Maestría en Ciencias de la Tierra",
    "Maestría en Física Aplicada",
    "Maestría en Gestión de Riesgos Naturales, Prevención y Atención de Desastres",
    "Maestría en Ingeniería Ambiental",
    "Maestría en Urbanismo y Desarrollo Territorial",
    "Maestría en Gobierno de Tecnología Informática",
    "Maestría en Ingeniería Biomédica",
    "Maestría en Ingeniería Electrónica",
    "Maestría en Ingeniería Eléctrica",
    "Maestría en Análisis y Gestión de Sistemas Eléctricos",
    "Maestría en Trastornos Cognoscitivos y del Aprendizaje",
    "Maestría en Salud Mental y Convivencia en Contextos Educativos",
    "Maestría en Literatura y Escrituras Creativas",
    "Maestría en Enseñanza del Inglés",
    "Maestría en Lenguaje y Sociedad",
    "Maestría en Educación Mediada por TIC",
    "Maestría en Educación",
    "Maestría en Desarrollo Organizacional y Procesos Humanos",
    "Maestría en Desarrollo Social",
    "Maestría en Periodismo",
    "Maestría en Pedagogía Social e Intervención Educativa en Contextos Sociales",
    "Maestría en Diseño e Innovación",
    "Maestría en Comunicación",
    "Maestría en Salud Pública",
    "Maestría en Epidemiología Clínica",
    "Maestría en Epidemiología",
    "Maestría en Enfermería",
    "Maestría en Ciencias Básicas Biomédicas",
    "Maestría en Derecho",
    "Maestría en Derecho Civil y de Familia",
    "Maestría en Tributación y Aduanas",
    "Maestría en Derecho Público",
    "Maestría en Ciencia Política y Gobierno",
    "Maestría en Derecho Ambiental y Urbano Territorial",
    "Maestría en Derecho del Comercio",
    "Maestría en Mercadeo",
    "Maestría en Negocios Internacionales",
    "Maestría en Ciencias Naturales",
    "Maestría en Psicología",
    "Maestría en Psicología Clínica",
    "Doctorado en Administración de Empresas",
    "Doctorado en Ingeniería Industrial",
    "Doctorado en Ingeniería Mecánica",
    "Doctorado en Ingeniería de Sistemas y Computación",
    "Doctorado en Ingeniería Civil",
    "Doctorado en Derecho",
    "Doctorado en Psicología",
    "Doctorado en Ciencias Sociales",
    "Doctorado en Ciencias Biomédicas",
    "Doctorado en Ciencias Naturales",
    "Doctorado en Ciencias del Mar",
]


async def sembrar_catalogos_action(db: AsyncSession) -> int:
    """Programas Uninorte por nivel. Agrega faltantes y nivela existentes."""
    creados = 0
    actualizados = 0
    for valor, nivel in [(v, "pregrado") for v in PREGRADOS] + [(v, "posgrado") for v in POSGRADOS]:
        existente = await db.execute(
            select(Catalogo).where(
                Catalogo.tipo == "programa",
                func.lower(Catalogo.valor) == valor.lower(),
            )
        )
        item = existente.scalar_one_or_none()
        if not item:
            db.add(Catalogo(tipo="programa", valor=valor, nivel=nivel, activo=True))
            creados += 1
        elif item.nivel is None:
            item.nivel = nivel
            actualizados += 1
    if creados or actualizados:
        await db.commit()
    return creados
