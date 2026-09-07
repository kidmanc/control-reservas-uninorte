import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import './PanelSidebar.css';

const NAV_ITEMS = [
  { to: '/panel', label: 'Casos', end: true },
  { to: '/panel/reportes', label: 'Reportes', staffOnly: true },
  { to: '/panel/configuracion', label: 'Configuración', staffOnly: true },
  { to: '/panel/usuarios', label: 'Usuarios', adminOnly: true },
];

const ROL_LABEL = {
  admin: 'Tesorero',
  asistente_tesoreria: 'Asistente de Tesorería',
  revisor: 'Revisor',
};

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

      {NAV_ITEMS.filter(
        (item) =>
          (!item.adminOnly || user?.rol === 'admin') &&
          (!item.staffOnly || user?.rol !== 'revisor'),
      ).map((item) => (
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
          <div className="user-role">{ROL_LABEL[user?.rol] || user?.rol || ''}</div>
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
