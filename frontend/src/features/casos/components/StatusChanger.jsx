import { ESTADOS_ORDEN, ESTADO_LABEL, ESTADOS_FINALES, ESTADOS } from '../constants';
import { IconCheck } from '../../../components/ui/icons';

export default function StatusChanger({ estadoActual, onCambiar, cambiando, esAdmin = false, soloFinales = false, soloNoFinales = false, puedeAprobar = true }) {
  const casoEnEstadoFinal = ESTADOS_FINALES.includes(estadoActual);
  const esperaDocumentacion = estadoActual === ESTADOS.FALTA_DOCUMENTACION;
  const bloqueado = casoEnEstadoFinal || esperaDocumentacion;
  const puedeCambiar = esAdmin || !bloqueado;

  // "En revisión" lo pone el proceso automático a las 24 h: no es opción manual.
  const opciones = ESTADOS_ORDEN.filter((estado) => estado !== ESTADOS.EN_REVISION);

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
        {opciones.map((estado) => {
          const esFinal = ESTADOS_FINALES.includes(estado);
          const esAprobado = estado === ESTADOS.APROBADO;
          const esRecibido = estado === ESTADOS.RECIBIDO;
          let motivoBloqueo = null;
          if (!puedeCambiar) motivoBloqueo = hint;
          else if (soloFinales && !esFinal) motivoBloqueo = 'Como aprobador final solo registras la aprobación o el rechazo.';
          else if (soloNoFinales && esFinal) motivoBloqueo = 'Solo el aprobador final registra la aprobación o el rechazo.';
          else if (esRecibido && estadoActual !== ESTADOS.RECIBIDO) motivoBloqueo = 'Recibido es el estado inicial: no se puede volver a él.';
          else if (esAprobado && !puedeAprobar) motivoBloqueo = 'Fija el porcentaje (y el destino si es devolución) en la decisión antes de aprobar.';
          const deshabilitado = cambiando || estado === estadoActual || motivoBloqueo !== null;
          return (
            <button
              key={estado}
              type="button"
              className={`status-option${estado === estadoActual ? ' selected' : ''}`}
              disabled={deshabilitado}
              onClick={() => onCambiar(estado)}
              title={motivoBloqueo || undefined}
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