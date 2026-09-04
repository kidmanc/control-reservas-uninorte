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
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API}${url}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Error del servidor' }));
    throw new Error(error.detail || `Error ${res.status}`);
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

export async function crearCaso(payload) {
  const body = {
    nombre_completo: payload.nombre_completo,
    codigo_estudiantil: payload.codigo_estudiantil,
    correo_institucional: payload.correo_institucional,
    telefono_contacto: payload.telefono_contacto,
    programa_academico: payload.programa_academico,
    tipo_solicitud: payload.tipo_solicitud,
    periodo_academico: payload.periodo_academico,
    motivo: payload.motivo,
    tercero: payload.tercero || null,
  };
  const caso = await request('/casos/', { method: 'POST', body: JSON.stringify(body) });
  return normalizarCaso(caso);
}

// Las funciones de escritura reciben el numero_caso (de la URL) y resuelven el id interno
export async function cambiarEstado(numeroCaso, nuevoEstado) {
  const { db_id } = await getCaso(numeroCaso);
  const caso = await request(`/casos/${db_id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ nuevo_estado: nuevoEstado }),
  });
  return normalizarCaso(caso);
}

export async function agregarComentario(numeroCaso, { texto, visible_para_estudiante, autor }) {
  const { db_id } = await getCaso(numeroCaso);
  await request(`/casos/${db_id}/comentarios/`, {
    method: 'POST',
    body: JSON.stringify({ texto, visible_para_estudiante, autor }),
  });
  return getCaso(numeroCaso);
}

export async function subirArchivoEstudiante(numeroCaso, archivo) {
  const { db_id } = await getCaso(numeroCaso);
  const formData = new FormData();
  formData.append('archivo', archivo);
  formData.append('subido_por', 'estudiante');

  await request(`/casos/${db_id}/archivos/`, {
    method: 'POST',
    body: formData,
  });
  return getCaso(numeroCaso);
}
