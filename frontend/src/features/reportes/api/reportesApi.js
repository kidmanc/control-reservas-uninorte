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
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo (puerto 8000).');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Error del servidor' }));
    const err = new Error(error.detail || `Error ${res.status}`);
    err.status = res.status;
    if (res.status === 401) {
      window.dispatchEvent(new Event('sesion-expirada'));
    }
    throw err;
  }
  return res.json();
}

export async function obtenerResumen({ periodo, tipo, desde, hasta } = {}) {
  const params = new URLSearchParams();
  if (periodo) params.append('periodo', periodo);
  if (tipo) params.append('tipo_solicitud', tipo);
  if (desde) params.append('desde', desde);
  if (hasta) params.append('hasta', hasta);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/reportes/resumen${query}`);
}
