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
    res = await fetch(`${API}${url}`, { ...options, headers });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo (puerto 8000).');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Error del servidor' }));
    throw new Error(error.detail || `Error ${res.status}`);
  }
  return res.json();
}

export async function listarUsuarios() {
  return request('/usuarios/');
}

export async function crearUsuario({ nombre, correo, contrasena, iniciales, rol }) {
  return request('/usuarios/', {
    method: 'POST',
    body: JSON.stringify({ nombre, correo, contrasena, iniciales, rol }),
  });
}

export async function actualizarUsuario(id, cambios) {
  return request(`/usuarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(cambios),
  });
}