import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';

/**
 * Protege rutas que solo debe ver el tesorero (admin).
 * Requiere sesión y rol "admin".
 */
export default function AdminRoute({ children }) {
  const { user } = useAuth();
  return <ProtectedRoute>{user?.rol === 'admin' ? children : <Navigate to="/panel" replace />}</ProtectedRoute>;
}