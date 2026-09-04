import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import './PanelSidebar.css';

const NAV_ITEMS = [
  { to: '/panel', label: 'Casos', end: true },
  { to: '/panel/tipos', label: 'Tipos de solicitud' },
  { to: '/panel/reportes', label: 'Reportes' },
  { to: '/panel/configuracion', label: 'Configuración' },
];

export default function PanelSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate('/login', { replace: true });
  }

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
        <div className="avatar">{user?.iniciales || '??'}</div>
        <div style={{ flex: 1 }}>
          <div className="user-name">{user?.nombre || 'Sin sesión'}</div>
          <div className="user-role">{user?.rol || ''}</div>
        </div>
        <button
          onClick={onLogout}
          title="Cerrar sesión"
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 11,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Salir
        </button>
      </div>
    </aside>
  );
}
