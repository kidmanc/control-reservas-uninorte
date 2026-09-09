/**
 * CAPA DE DATOS — fetch al backend FastAPI.
 *
 * El identificador público/visible de un caso es `numero_caso` (ej. "RM-2026-0042"),
 * que es lo que viaja en las URLs de navegación. Internamente el backend usa un
 * `id` entero (campo `db_id`) para las operaciones de escritura. Aquí resolvemos
 * ese id numérico y las llamadas a la API usan siempre el correcto.
 */

const API = '/api';

async function request(url, options = {}) {
  // `publica: true` = canal público del estudiante: jamás envía el token del
  // panel. Sin esto, un navegador con sesión de revisor abierta contaminaría
  // la vista de seguimiento y el backend aplicaría la restricción de revisor.
  const token = options.publica ? null : localStorage.getItem('token');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    // no-store: la bandeja debe reflejar cada movimiento al instante.
    res = await fetch(`${API}${url}`, { cache: 'no-store', ...options, headers });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo (puerto 8000).');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Error del servidor' }));
    const err = new Error(error.detail || `Error ${res.status}`);
    err.status = res.status;
    // 401 en el panel = sesión vencida o revocada: se avisa al AuthContext
    // para cerrar sesión. El canal público nunca dispara esto.
    if (res.status === 401 && !options.publica) {
      window.dispatchEvent(new Event('sesion-expirada'));
    }
    throw err;
  }
  return res.json();
}

function normalizarCaso(caso) {
  if (!caso) return null;
  return {
    ...caso,
    // id visible = número de caso (para navegación y mostrado)
    id: caso.numero_caso,
    // id interno = entero (para APIs de escritura)
    db_id: caso.id,
    tercero: caso.tercero_nombre
      ? {
          nombre_completo: caso.tercero_nombre,
          parentesco: caso.tercero_parentesco,
          documento_identidad: caso.tercero_documento,
          telefono_contacto: caso.tercero_telefono,
          correo_contacto: caso.tercero_correo,
        }
      : null,
  };
}

export async function listCasos() {
  const casos = await request('/casos/');
  return casos.map(normalizarCaso);
}

// getCaso recibe el numero_caso (identificador visible de la URL)
export async function getCaso(numeroCaso) {
  const caso = await request(`/casos/numero/${numeroCaso}`);
  return normalizarCaso(caso);
}

// Variante pública para la página de seguimiento del estudiante (sin token).
// El backend exige número + código en cada acceso anónimo.
export async function getCasoPublico(numeroCaso, codigo) {
  const query = codigo ? `?${new URLSearchParams({ codigo })}` : '';
  const caso = await request(`/casos/numero/${numeroCaso}${query}`, { publica: true });
  return normalizarCaso(caso);
}

// Búsqueda pública por número + código estudiantil (página de consulta).
export async function buscarCasoPublico(numero, codigo) {
  const params = new URLSearchParams({ numero, codigo });
  const caso = await request(`/casos/seguimiento/buscar?${params.toString()}`, { publica: true });
  return normalizarCaso(caso);
}

export async function crearCaso(payload) {
  const body = {
    nombre_completo: payload.nombre_completo,
    codigo_estudiantil: payload.codigo_estudiantil,
    correo_institucional: payload.correo_institucional,
    telefono_contacto: payload.telefono_contacto,
    programa_academico: payload.programa_academico,
    tipo_solicitud: payload.tipo_solicitud,
    nivel_academico: payload.nivel_academico,
    periodo_academico: payload.periodo_academico,
    motivo: payload.motivo,
    tercero: payload.tercero || null,
    descripcion_adjuntos: payload.descripcion_adjuntos || null,
  };
  const formData = new FormData();
  formData.append('datos', JSON.stringify(body));
  for (const archivo of payload.archivos || []) {
    formData.append('archivos', archivo);
  }
  const caso = await request('/casos/', { method: 'POST', body: formData });

  return normalizarCaso(caso);
}

// Las funciones de escritura reciben el numero_caso (de la URL) y resuelven el id interno
export async function cambiarEstado(numeroCaso, nuevoEstado) {
  const { db_id } = await getCaso(numeroCaso);
  await request(`/casos/${db_id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ nuevo_estado: nuevoEstado }),
  });
  return getCaso(numeroCaso);
}

export async function actualizarCasoDecision(numeroCaso, cambios) {
  const { db_id } = await getCaso(numeroCaso);
  await request(`/casos/${db_id}/decision`, {
    method: 'PATCH',
    body: JSON.stringify(cambios),
  });
  return getCaso(numeroCaso);
}

export async function remitirCaso(numeroCaso, revisorId, motivo = null, veredicto = null) {
  const { db_id } = await getCaso(numeroCaso);
  await request(`/casos/${db_id}/remitir`, {
    method: 'PATCH',
    body: JSON.stringify({ revisor_id: revisorId, motivo, veredicto }),
  });
  return getCaso(numeroCaso);
}

export async function listCasosParticipados() {
  const casos = await request('/casos/participados');
  return casos.map(normalizarCaso);
}

export async function obtenerArchivo(casoId, archivoId) {
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let res;
  try {
    res = await fetch(`${API}/casos/${casoId}/archivos/${archivoId}/descargar`, { cache: 'no-store', headers });
  } catch {
    throw new Error('No se pudo conectar con el servidor.');
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'No se pudo obtener el archivo' }));
    const err = new Error(error.detail || 'No se pudo obtener el archivo');
    err.status = res.status;
    if (res.status === 401) {
      window.dispatchEvent(new Event('sesion-expirada'));
    }
    throw err;
  }
  return res.blob();
}

export async function agregarComentario(numeroCaso, { texto, visible_para_estudiante, autor }) {
  const { db_id } = await getCaso(numeroCaso);
  await request(`/casos/${db_id}/comentarios/`, {
    method: 'POST',
    body: JSON.stringify({ texto, visible_para_estudiante, autor }),
  });
  return getCaso(numeroCaso);
}

export async function agregarComentarioPublico(numeroCaso, { texto, visible_para_estudiante, autor }, codigo) {
  const { db_id } = await getCasoPublico(numeroCaso, codigo);
  await request(`/casos/${db_id}/comentarios/`, {
    method: 'POST',
    body: JSON.stringify({ texto, visible_para_estudiante, autor, codigo }),
    publica: true,
  });
  return getCasoPublico(numeroCaso, codigo);
}

export async function subirArchivoEstudiante(numeroCaso, archivo, codigo) {
  const { db_id } = await getCasoPublico(numeroCaso, codigo);
  const formData = new FormData();
  formData.append('archivo', archivo);
  formData.append('subido_por', 'estudiante');
  formData.append('codigo', codigo || '');

  await request(`/casos/${db_id}/archivos/`, {
    method: 'POST',
    body: formData,
    publica: true,
  });
  return getCasoPublico(numeroCaso, codigo);
}

export async function subirArchivoInterno(numeroCaso, { archivo, descripcion, visible }) {
  const { db_id } = await getCaso(numeroCaso);
  const formData = new FormData();
  formData.append('archivo', archivo);
  if (descripcion) formData.append('descripcion', descripcion);
  formData.append('visible', visible ? 'true' : 'false');

  await request(`/casos/${db_id}/archivos/adjuntar`, {
    method: 'POST',
    body: formData,
  });
  return getCaso(numeroCaso);
}

export async function descargarArchivoPublico(numeroCaso, archivoId, codigo) {
  const { db_id } = await getCasoPublico(numeroCaso, codigo);
  let res;
  try {
    res = await fetch(
      `${API}/casos/${db_id}/archivos/${archivoId}/descargar?codigo=${encodeURIComponent(codigo || '')}`,
      { cache: 'no-store' },
    );
  } catch {
    throw new Error('No se pudo conectar con el servidor.');
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'No se pudo obtener el archivo' }));
    throw new Error(error.detail || 'No se pudo obtener el archivo');
  }
  return res.blob();
}
