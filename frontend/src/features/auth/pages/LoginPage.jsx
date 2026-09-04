import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const destino = location.state?.from?.pathname || '/panel';

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (!correo || !password) {
      setError('Ingresa tu correo institucional y contraseña.');
      return;
    }

    setEnviando(true);
    try {
      const exito = await login(correo, password);
      if (exito) {
        navigate(destino, { replace: true });
      } else {
        setError('Correo o contraseña incorrectos. Intenta de nuevo.');
      }
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="logo-mark">UN</div>
          <div>
            <div className="brand-title">Tesorería</div>
            <div className="brand-sub">Casos especiales</div>
          </div>
        </div>

        <h1>Iniciar sesión</h1>
        <p className="login-subtitle">
          Accede al panel de gestión de casos especiales del área de Tesorería.
        </p>

        <form onSubmit={onSubmit}>
          <div className="login-field">
            <label htmlFor="correo">Correo institucional</label>
            <input
              id="correo"
              type="email"
              placeholder="nombre@uninorte.edu.co"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn-primary login-btn" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="login-footer">
          <span>Sistema de gestión de casos especiales</span>
          <span>Universidad del Norte</span>
        </div>
      </div>
    </div>
  );
}
