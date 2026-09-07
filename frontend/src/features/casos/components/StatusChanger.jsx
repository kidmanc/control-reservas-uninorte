import { ESTADOS_ORDEN, ESTADO_LABEL, ESTADOS_FINALES, ESTADOS } from '../constants';
import { IconCheck } from '../../../components/ui/icons';

export default function StatusChanger({ estadoActual, onCambiar, cambiando, esAdmin = false, soloFinales = false }) {
  const casoEnEstadoFinal = ESTADOS_FINALES.includes(estadoActual);
  const esperaDocumentacion = estadoActual === ESTADOS.FALTA_DOCUMENTACION;
  const bloqueado = casoEnEstadoFinal || esperaDocumentacion;
  const puedeCambiar = esAdmin || !bloqueado;

  let hint = null;
  if (casoEnEstadoFinal) {
    hint = esAdmin
      ? 'Caso en estado final. Como tesorero puedes corregirlo manualmente.'
      : 'El caso está aprobado o rechazado. Solo el tesorero (admin) puede corregir su estado.';
  } else if (esperaDocumentacion) {
    hint = esAdmin
      ? 'Esperando documentación del estudiante. Como tesorero puedes avanzar el caso manualmente.'
      : 'El caso espera la documentación del estudiante. El estado cambiará automáticamente cuando la adjunte.';
  }

  return (
    <div className="sidebar-card">
      <h3>
        <IconCheck />
        Cambiar estado
      </h3>
      <div className="status-select">
        {ESTADOS_ORDEN.map((estado) => {
          const esFinal = ESTADOS_FINALES.includes(estado);
          const deshabilitado = cambiando || estado === estadoActual || !puedeCambiar || (soloFinales && !esFinal);
          return (
            <button
              key={estado}
              type="button"
              className={`status-option${estado === estadoActual ? ' selected' : ''}`}
              disabled={deshabilitado}
              onClick={() => onCambiar(estado)}
              title={!puedeCambiar ? hint : undefined}
            >
              <span className="radio" />
              {ESTADO_LABEL[estado]}
            </button>
          );
        })}
      </div>
      {soloFinales && !casoEnEstadoFinal && (
        <p className="empty-hint" style={{ marginTop: 10 }}>
          Como aprobador final solo registras la aprobación o el rechazo del caso.
        </p>
      )}
      {hint && (
        <p className="empty-hint" style={{ marginTop: 10 }}>
          {hint}
        </p>
      )}
    </div>
  );
}