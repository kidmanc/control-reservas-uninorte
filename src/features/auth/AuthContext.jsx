import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Mock de usuarios válidos — REEMPLAZAR con POST /api/auth/login cuando exista el backend.
// Cada objeto simula lo que retornaría el endpoint de login.
const MOCK_USERS = [
  {
    id: 1,
    nombre: 'Carolina Mejía',
    correo: 'carolina.mejia@uninorte.edu.co',
    rol: 'asistente_tesoreria',
    iniciales: 'CM',
    password: 'password123',
  },
];

/**
 * Provee estado de autenticación global.
 *
 * Contrato futuro con el backend:
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
      try {
        setUser(JSON.parse(usuarioGuardado));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setCargando(false);
  }, []);

  /**
   * Intenta iniciar sesión.
   * Por ahora usa mock; cuando exista el backend, reemplazar por fetch.
   *
   * @returns {boolean} true si el login fue exitoso
   */
  async function login(correo, password) {
    // --- MOCK: simular latencia de red ---
    await new Promise((r) => setTimeout(r, 400));

    const encontrado = MOCK_USERS.find(
      (u) => u.correo === correo && u.password === password
    );

    if (!encontrado) {
      return false;
    }

    const { password: _, ...usuario } = encontrado;
    const tokenMock = `mock-jwt-${usuario.id}-${Date.now()}`;

    localStorage.setItem('token', tokenMock);
    localStorage.setItem('user', JSON.stringify(usuario));
    setUser(usuario);
    return true;

    // --- FUTURO: cuando exista el backend ---
    // const res = await fetch('/api/auth/login', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ correo, password }),
    // });
    // if (!res.ok) return false;
    // const { access_token, user: userData } = await res.json();
    // localStorage.setItem('token', access_token);
    // localStorage.setItem('user', JSON.stringify(userData));
    // setUser(userData);
    // return true;
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
