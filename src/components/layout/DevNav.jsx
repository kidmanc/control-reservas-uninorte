import { NavLink } from 'react-router-dom';

/**
 * SOLO PARA DESARROLLO. Reemplaza a las "pestañas" del mockup original
 * (que eran un solo HTML con 3 vistas) ahora que cada vista es una ruta real.
 * Bórrala de App.jsx cuando el flujo real de navegación (login, "Nuevo caso creado" -> panel, etc.)
 * esté definido — no es parte del producto.
 */
export default function DevNav() {
  const linkStyle = ({ isActive }) => ({
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #38372f',
    background: isActive ? 'var(--rojo)' : 'transparent',
    color: isActive ? 'white' : '#d9d7d1',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 13,
    textDecoration: 'none',
  });

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 999,
        display: 'flex',
        gap: 8,
        padding: '12px 24px',
        background: 'var(--negro)',
        alignItems: 'center',
      }}
    >
      <span style={{ color: '#a3a39f', fontSize: 12, fontFamily: 'var(--font-display)', marginRight: 8 }}>
        DEV · NAVEGACIÓN DE PREVIEW (no forma parte del producto)
      </span>
      <NavLink to="/" style={linkStyle} end>
        1. Formulario Estudiante
      </NavLink>
      <NavLink to="/panel" style={linkStyle}>
        2. Panel — Lista de Casos
      </NavLink>
    </div>
  );
}
