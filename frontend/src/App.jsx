import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import ProtectedRoute from './features/auth/ProtectedRoute';
import AdminRoute from './features/auth/AdminRoute';
import StaffRoute from './features/auth/StaffRoute';
import FormularioCasoPage from './features/casos/pages/FormularioCasoPage';
import ListaCasosPage from './features/casos/pages/ListaCasosPage';
import DetalleCasoPage from './features/casos/pages/DetalleCasoPage';
import SeguimientoCasoPage from './features/casos/pages/SeguimientoCasoPage';
import LoginPage from './features/auth/pages/LoginPage';
import UsuariosPage from './features/usuarios/pages/UsuariosPage';
import ReportesPage from './features/reportes/pages/ReportesPage';
import ConfiguracionPage from './features/configuracion/pages/ConfiguracionPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Vistas públicas */}
          <Route path="/" element={<FormularioCasoPage />} />
          <Route path="/seguimiento/:id" element={<SeguimientoCasoPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Panel interno de Tesorería — requiere autenticación */}
          <Route
            path="/panel"
            element={
              <ProtectedRoute>
                <ListaCasosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panel/casos/:id"
            element={
              <ProtectedRoute>
                <DetalleCasoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panel/casos/nueva"
            element={
              <ProtectedRoute>
                <FormularioCasoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panel/usuarios"
            element={
              <AdminRoute>
                <UsuariosPage />
              </AdminRoute>
            }
          />
          <Route
            path="/panel/reportes"
            element={
              <StaffRoute>
                <ReportesPage />
              </StaffRoute>
            }
          />
          <Route
            path="/panel/configuracion"
            element={
              <ProtectedRoute>
                <ConfiguracionPage />
              </ProtectedRoute>
            }
          />

          {/* TODO: ruta de "Tipos de solicitud" */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
