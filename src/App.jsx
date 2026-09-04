import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FormularioCasoPage from './features/casos/pages/FormularioCasoPage';
import ListaCasosPage from './features/casos/pages/ListaCasosPage';
import DetalleCasoPage from './features/casos/pages/DetalleCasoPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Vista pública: formulario de estudiante/tercero */}
        <Route path="/" element={<FormularioCasoPage />} />

        {/* Panel interno de Tesorería */}
        <Route path="/panel" element={<ListaCasosPage />} />
        <Route path="/panel/casos/:id" element={<DetalleCasoPage />} />

        {/* TODO: rutas de "Tipos de solicitud", "Reportes" y "Configuración" (ver PanelSidebar) */}
      </Routes>
    </BrowserRouter>
  );
}
