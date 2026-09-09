import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import ProtectedRoute from './features/auth/ProtectedRoute';
import AdminRoute from './features/auth/AdminRoute';
import StaffRoute from './features/auth/StaffRoute';
import FormularioCasoPage from './features/casos/pages/FormularioCasoPage';
import ListaCasosPage from './features/casos/pages/ListaCasosPage';
import DetalleCasoPage from './features/casos/pages/DetalleCasoPage';
import SeguimientoCasoPage from './features/casos/pages/SeguimientoCasoPage';
import ConsultaCasoPage from './features/casos/pages/ConsultaCasoPage';
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
          <Route path="/seguimiento" element={<ConsultaCasoPage />} />
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

          {/* Cualquier otra URL: pantalla 404 en vez de página en blanco */}
          <Route path="*" element={<NoEncontrado />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function NoEncontrado() {
  return (
    <main style={{ maxWidth: 560, margin: '72px auto', padding: '0 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Página no encontrada</h1>
      <p style={{ color: '#555', marginBottom: 24 }}>
        La dirección que buscaste no existe en el sistema de casos de Tesorería.
      </p>
      <Link to="/" style={{ fontWeight: 700 }}>
        Ir al formulario de solicitud
      </Link>
    </main>
  );
}
