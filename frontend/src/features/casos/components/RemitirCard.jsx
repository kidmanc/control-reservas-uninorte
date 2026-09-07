import { useState } from 'react';
import { IconUsers } from '../../../components/ui/icons';
import './RemitirCard.css';

export default function RemitirCard({ caso, revisores, onRemitir, remitiendo }) {
  const [seleccionado, setSeleccionado] = useState('');
  const asignado = revisores.find((r) => r.id === caso.revisor_asignado_id) || null;

  function onConfirmar() {
    if (!seleccionado) return;
    onRemitir(Number(seleccionado));
    setSeleccionado('');
  }

  return (
    <div className="sidebar-card">
      <h3>
        <IconUsers />
        Remitir a revisión
      </h3>

      {asignado ? (
        <p className="empty-hint">
          Remitido a <strong>{asignado.nombre}</strong> para revisión.
        </p>
      ) : (
        <p className="empty-hint">El caso aún no está remitido a ningún revisor.</p>
      )}

      <div className="remit-field">
        <label>Revisor (incluye al Centro Médico)</label>
        <select value={seleccionado} disabled={remitiendo} onChange={(e) => setSeleccionado(e.target.value)}>
          <option value="">Selecciona el revisor</option>
          {revisores.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="remit-actions">
        <button type="button" className="btn-primary remit-btn" disabled={remitiendo || !seleccionado} onClick={onConfirmar}>
          {remitiendo ? 'Remitiendo…' : 'Remitir caso'}
        </button>
        {asignado && (
          <button type="button" className="remit-quitar" disabled={remitiendo} onClick={() => onRemitir(null)}>
            Quitar remisión
          </button>
        )}
      </div>

      {revisores.length === 0 && (
        <p className="empty-hint" style={{ marginTop: 10 }}>
          No hay revisores activos. El tesorero puede crearlos en Gestión de usuarios.
        </p>
      )}
    </div>
  );
}