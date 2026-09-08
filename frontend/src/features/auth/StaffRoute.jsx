import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';

const ROLES_TESORERIA = ['admin', 'asistente_tesoreria'];

/**
 * Protege rutas del personal de Tesorería (tesorero y asistente).
 * Requiere sesión y rol de Tesorería; el resto vuelve a la lista de casos.
 */
export default function StaffRoute({ children }) {
  const { user } = useAuth();
  return (
    <ProtectedRoute>
      {ROLES_TESORERIA.includes(user?.rol) ? children : <Navigate to="/panel" replace />}
    </ProtectedRoute>
  );
}
