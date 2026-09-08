// Período académico Uninorte derivado de la fecha.
//
// Regla: meses 1-6 -> AAAA-10 (primer semestre), meses 7-12 -> AAAA-20
// (segundo semestre). Si el corte real del calendario es otro mes,
// se ajusta SOLO la comparación de `periodoAcademicoDeFecha`.

export function periodoAcademicoDeFecha(fecha = new Date()) {
  const year = fecha.getFullYear();
  const mes = fecha.getMonth() + 1;
  return `${year}-${mes <= 6 ? '10' : '20'}`;
}

function parsearPeriodo(periodo) {
  const coincidencia = /^(\d{4})-(10|20)$/.exec(periodo || '');
  if (!coincidencia) return null;
  return { year: Number(coincidencia[1]), codigo: coincidencia[2] };
}

export function periodoAnterior(periodo) {
  const parsed = parsearPeriodo(periodo);
  if (!parsed) return periodo;
  return parsed.codigo === '10' ? `${parsed.year - 1}-20` : `${parsed.year}-10`;
}

export function periodoSiguiente(periodo) {
  const parsed = parsearPeriodo(periodo);
  if (!parsed) return periodo;
  return parsed.codigo === '10' ? `${parsed.year}-20` : `${parsed.year + 1}-10`;
}

// Anterior, actual y siguiente: cubre solicitudes de períodos vecinos
// (ej. en diciembre para el primer semestre entrante).
export function periodosCercanos(fecha = new Date()) {
  const actual = periodoAcademicoDeFecha(fecha);
  return [periodoAnterior(actual), actual, periodoSiguiente(actual)];
}
