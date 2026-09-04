import { NavLink } from 'react-router-dom';
import './PanelSidebar.css';

// TODO(auth): reemplazar por el usuario autenticado real cuando exista login institucional.
const USUARIO_ACTUAL = { nombre: 'Carolina Mejía', rol: 'Asistente Tesorería', iniciales: 'CM' };

const NAV_ITEMS = [
  { to: '/panel', label: 'Casos', end: true },
  { to: '/panel/tipos', label: 'Tipos de solicitud' },
  { to: '/panel/reportes', label: 'Reportes' },
  { to: '/panel/configuracion', label: 'Configuración' },
];

export default function PanelSidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo-mark">UN</div>
        <div>
          <div className="brand-text">Tesorería</div>
          <div className="brand-sub">Casos especiales</div>
        </div>
      </div>

      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="dot" /> {item.label}
        </NavLink>
      ))}

      <div className="sidebar-footer">
        <div className="avatar">{USUARIO_ACTUAL.iniciales}</div>
        <div>
          <div className="user-name">{USUARIO_ACTUAL.nombre}</div>
          <div className="user-role">{USUARIO_ACTUAL.rol}</div>
        </div>
      </div>
    </aside>
  );
}
