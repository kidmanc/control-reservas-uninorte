import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

/**
 * Provee estado de autenticación global.
 *
 * Contrato con el backend:
 * - login(correo, password) → POST /api/auth/login → { access_token, user }
 * - Al montar, si hay token → GET /api/auth/me → user
 * - logout() → limpiar token
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Al montar: si hay token, validarlo contra el backend. Un token vencido
  // o revocado (usuario desactivado) se limpia en vez de parecer válido.
  // Además se escucha 'sesion-expirada': cualquier API lo dispara ante un
  // 401 y la sesión se cierra sola.
  useEffect(() => {
    let vigente = true;
    const token = localStorage.getItem('token');

    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          if (!res.ok) throw new Error('Sesión inválida');
          return res.json();
        })
        .then((data) => {
          if (!vigente) return;
          const sesion = data.user || data;
          localStorage.setItem('user', JSON.stringify(sesion));
          setUser(sesion);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (vigente) setUser(null);
        })
        .finally(() => {
          if (vigente) setCargando(false);
        });
    } else {
      setCargando(false);
    }

    const alExpirar = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    };
    window.addEventListener('sesion-expirada', alExpirar);
    return () => {
      vigente = false;
      window.removeEventListener('sesion-expirada', alExpirar);
    };
  }, []);

  /**
   * Intenta iniciar sesión contra el backend FastAPI.
   *
   * @returns {boolean} true si el login fue exitoso, false si credenciales incorrectas.
   * @throws {Error} si no se pudo conectar con el servidor.
   */
  async function login(correo, password) {
    let res;
    try {
      res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contrasena: password }),
      });
    } catch {
      throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo (puerto 8000).');
    }

    if (!res.ok) return false;

    const { access_token, user: userData } = await res.json();
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return true;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  const value = {
    user,
    cargando,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
