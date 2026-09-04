import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Wrapper que protege rutas que requieren autenticación.
 * Si no hay sesión, redirige a /login guardando la ubicación actual
 * para poder volver después del login.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>Cargando…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
