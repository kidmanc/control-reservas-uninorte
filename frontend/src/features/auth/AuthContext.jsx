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

  // Al montar, verificar si hay sesión guardada
  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioGuardado = localStorage.getItem('user');

    if (token && usuarioGuardado) {
      setUser(JSON.parse(usuarioGuardado));
    }
    setCargando(false);
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
