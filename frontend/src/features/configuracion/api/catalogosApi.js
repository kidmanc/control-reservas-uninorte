const API = '/api';

async function request(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(`${API}${url}`, { cache: 'no-store', ...options, headers });
  } catch {
    throw new Error('No se pudo conectar con el servidor.');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Error del servidor' }));
    throw new Error(error.detail || `Error ${res.status}`);
  }
  // 204 Sin contenido (ej. eliminar).
  if (res.status === 204) return null;
  return res.json();
}

export async function listarCatalogos() {
  return request('/catalogos/');
}

export async function crearCatalogo({ tipo, valor }) {
  return request('/catalogos/', {
    method: 'POST',
    body: JSON.stringify({ tipo, valor }),
  });
}

export async function actualizarCatalogo(id, cambios) {
  return request(`/catalogos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(cambios),
  });
}

export async function eliminarCatalogo(id) {
  return request(`/catalogos/${id}`, { method: 'DELETE' });
}
