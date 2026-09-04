import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FormularioCasoPage from './features/casos/pages/FormularioCasoPage';
import ListaCasosPage from './features/casos/pages/ListaCasosPage';
import DetalleCasoPage from './features/casos/pages/DetalleCasoPage';
import SeguimientoCasoPage from './features/casos/pages/SeguimientoCasoPage';
import DevNav from './components/layout/DevNav';

export default function App() {
  return (
    <BrowserRouter>
      {/* Quitar DevNav cuando el flujo real de navegación esté definido — ver components/layout/DevNav.jsx */}
      <DevNav />
      <Routes>
        {/* Vista pública: formulario de estudiante/tercero */}
        <Route path="/" element={<FormularioCasoPage />} />

        {/* Vista pública: seguimiento del caso (enlace enviado por correo, sin login) */}
        <Route path="/seguimiento/:id" element={<SeguimientoCasoPage />} />

        {/* Panel interno de Tesorería */}
        <Route path="/panel" element={<ListaCasosPage />} />
        <Route path="/panel/casos/:id" element={<DetalleCasoPage />} />

        {/* TODO: rutas de "Tipos de solicitud", "Reportes" y "Configuración" (ver PanelSidebar) */}
      </Routes>
    </BrowserRouter>
  );
}
