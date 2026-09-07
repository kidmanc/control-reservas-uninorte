import { useState } from 'react';
import { IconUsers } from '../../../components/ui/icons';
import './RemitirCard.css';

// Refleja la tabla PASOS_FLUJO del backend: tenedor actual -> pasos válidos.
// El backend impone la tabla; aquí solo se muestran los pasos permitidos.
const ROL_LABEL = {
  revisor: 'Revisión de detalle',
  centro_medico: 'Centro Médico',
  aprobador: 'Aprobación final',
};

function pasosValidos(tenedor, destinatarios, caso) {
  const rolTenedor = tenedor?.rol || null;

  // En Tesorería (Mónica): al Centro Médico o a revisión de detalle.
  if (rolTenedor === null) {
    return destinatarios
      .filter((d) => d.rol === 'revisor' || d.rol === 'centro_medico')
      .map((d) => ({
        revisor_id: d.id,
        etiqueta: `${d.nombre} — ${ROL_LABEL[d.rol] || d.rol}`,
        esDevolucion: false,
      }));
  }

  // Centro Médico: solo devuelve a Mónica con su visto bueno.
  if (rolTenedor === 'centro_medico') {
    return [{ revisor_id: null, etiqueta: 'Devolver a Mónica (Tesorería)', esDevolucion: true }];
  }

  // Revisión de detalle (Robin): a aprobación final o de vuelta a Mónica.
  if (rolTenedor === 'revisor') {
    const adelantes = destinatarios
      .filter((d) => d.rol === 'aprobador')
      .map((d) => ({
        revisor_id: d.id,
        etiqueta: `Enviar a aprobación final (${d.nombre})`,
        esDevolucion: false,
      }));
    return [...adelantes, { revisor_id: null, etiqueta: 'Devolver a Mónica (Tesorería)', esDevolucion: true }];
  }

  // Aprobador final (JG): solo devuelve a quien se lo envió. Si el remitente
  // ya no está disponible, se listan los revisores (Tesorería decide).
  if (rolTenedor === 'aprobador') {
    const remitente =
      destinatarios.find((d) => d.id === caso.remitido_por_id && d.rol === 'revisor') || null;
    if (remitente) {
      return [
        {
          revisor_id: remitente.id,
          etiqueta: `Devolver a ${remitente.nombre} (quien te lo envió)`,
          esDevolucion: true,
        },
      ];
    }
    return destinatarios
      .filter((d) => d.rol === 'revisor')
      .map((d) => ({
        revisor_id: d.id,
        etiqueta: `Devolver a revisión de detalle (${d.nombre})`,
        esDevolucion: true,
      }));
  }

  return [];
}

export default function RemitirCard({ caso, destinatarios, onRemitir, remitiendo, rolActor }) {
  const [indice, setIndice] = useState('');
  const [motivo, setMotivo] = useState('');

  const tenedor = destinatarios.find((d) => d.id === caso.revisor_asignado_id) || null;
  const pasos = pasosValidos(tenedor, destinatarios, caso);
  const paso = indice === '' ? null : pasos[Number(indice)];
  const faltaMotivo = paso?.esDevolucion && !motivo.trim();
  const esTesoreria = rolActor === 'admin' || rolActor === 'asistente_tesoreria';

  function onConfirmar() {
    if (!paso || faltaMotivo) return;
    onRemitir(paso.revisor_id, paso.esDevolucion ? motivo.trim() : null);
    setIndice('');
    setMotivo('');
  }

  return (
    <div className="sidebar-card">
      <h3>
        <IconUsers />
        Recorrido del caso
      </h3>

      <p className="empty-hint">
        En manos de:{' '}
        <strong>{tenedor ? `${tenedor.nombre} (${ROL_LABEL[tenedor.rol] || tenedor.rol})` : 'Tesorería (Mónica)'}</strong>
      </p>

      {pasos.length === 0 ? (
        <p className="empty-hint" style={{ marginTop: 10 }}>
          {esTesoreria
            ? 'No hay cuentas disponibles para este paso (falta crear revisor, Centro Médico o aprobador). La tesorera puede crearlas en Gestión de usuarios.'
            : 'No hay pasos disponibles desde aquí. Pídelo a Tesorería.'}
        </p>
      ) : (
        <>
          <div className="remit-field">
            <label>Siguiente paso</label>
            <select value={indice} disabled={remitiendo} onChange={(e) => setIndice(e.target.value)}>
              <option value="">Selecciona el siguiente paso</option>
              {pasos.map((p, i) => (
                <option key={`${p.revisor_id}-${i}`} value={i}>
                  {p.etiqueta}
                </option>
              ))}
            </select>
          </div>

          {paso?.esDevolucion && (
            <div className="remit-field">
              <label>Motivo de la devolución</label>
              <textarea
                className="remit-motivo"
                placeholder="Explica qué se debe corregir (obligatorio, queda en el historial)"
                value={motivo}
                disabled={remitiendo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          )}

          <div className="remit-actions">
            <button
              type="button"
              className="btn-primary remit-btn"
              disabled={remitiendo || !paso || faltaMotivo}
              onClick={onConfirmar}
            >
              {remitiendo ? 'Moviendo…' : 'Confirmar paso'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}