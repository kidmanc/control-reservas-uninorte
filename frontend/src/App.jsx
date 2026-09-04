import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import ProtectedRoute from './features/auth/ProtectedRoute';
import FormularioCasoPage from './features/casos/pages/FormularioCasoPage';
import ListaCasosPage from './features/casos/pages/ListaCasosPage';
import DetalleCasoPage from './features/casos/pages/DetalleCasoPage';
import SeguimientoCasoPage from './features/casos/pages/SeguimientoCasoPage';
import LoginPage from './features/auth/pages/LoginPage';

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

          {/* TODO: rutas de "Tipos de solicitud", "Reportes" y "Configuración" */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
