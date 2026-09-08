import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buscarCasoPublico } from '../api/casosApi';
import './FormularioCasoPage.css';
import './ConsultaCasoPage.css';

export default function ConsultaCasoPage() {
  const navigate = useNavigate();
  const [numero, setNumero] = useState('');
  const [codigo, setCodigo] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!numero.trim() || !codigo.trim()) {
      setError('Ingresa el número de caso y tu código estudiantil.');
      return;
    }

    setBuscando(true);
    try {
      const caso = await buscarCasoPublico(numero.trim(), codigo.trim());
      navigate(`/seguimiento/${caso.id}`);
    } catch (err) {
      setError(err.message || 'No encontramos ningún caso con esos datos.');
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="student-page">
      <header className="student-header">
        <div className="logo-mark">UN</div>
        <div>
          <div className="header-title">Tesorería · Universidad del Norte</div>
          <div className="header-sub">Casos especiales</div>
        </div>
      </header>

      <form className="student-container consulta-card" onSubmit={onSubmit}>
        <h1>Consulta el estado de tu solicitud</h1>
        <p>
          Ingresa el número de caso que recibiste al enviar tu solicitud
          (ej. <strong>RM-2026-0042</strong>) y tu código estudiantil.
        </p>

        <div className="field">
          <label>Número de caso</label>
          <input
            type="text"
            placeholder="Ej. RM-2026-0042"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Código estudiantil</label>
          <input
            type="text"
            placeholder="Ej. 200145632"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={buscando}>
          {buscando ? 'Buscando…' : 'Consultar caso'}
        </button>

        <Link className="consulta-link" to="/">
          ← Volver al formulario de solicitud
        </Link>
      </form>
    </div>
  );
}
