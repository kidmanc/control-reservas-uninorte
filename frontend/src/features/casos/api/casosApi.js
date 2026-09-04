/**
 * CAPA DE DATOS — fetch al backend FastAPI.
 *
 * Cada función corresponde a un endpoint del backend.
 * Los componentes no cambian, solo se reemplazó el mock por fetch.
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
    id: caso.numero_caso,
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

export async function cambiarEstado(id, nuevoEstado) {
  const caso = await request(`/casos/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ nuevo_estado: nuevoEstado }),
  });
  return normalizarCaso(caso);
}

export async function agregarComentario(id, { texto, visible_para_estudiante, autor }) {
  await request(`/casos/${id}/comentarios/`, {
    method: 'POST',
    body: JSON.stringify({ texto, visible_para_estudiante, autor }),
  });
  // Recargar el caso completo con los nuevos comentarios
  return getCaso(id);
}

export async function subirArchivoEstudiante(id, archivo) {
  const formData = new FormData();
  formData.append('archivo', archivo);
  formData.append('subido_por', 'estudiante');

  await request(`/casos/${id}/archivos/`, {
    method: 'POST',
    body: formData,
  });
  // Recargar el caso completo con los nuevos archivos
  return getCaso(id);
}
