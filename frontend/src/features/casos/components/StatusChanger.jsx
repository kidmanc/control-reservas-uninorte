import { ESTADOS_ORDEN, ESTADO_LABEL, ESTADOS_FINALES } from '../constants';
import { IconCheck } from '../../../components/ui/icons';

export default function StatusChanger({ estadoActual, onCambiar, cambiando }) {
  const casoEnEstadoFinal = ESTADOS_FINALES.includes(estadoActual);

  return (
    <div className="sidebar-card">
      <h3>
        <IconCheck />
        Cambiar estado
      </h3>
      <div className="status-select">
        {ESTADOS_ORDEN.map((estado) => (
          <button
            key={estado}
            type="button"
            className={`status-option${estado === estadoActual ? ' selected' : ''}`}
            disabled={cambiando || estado === estadoActual}
            onClick={() => onCambiar(estado)}
          >
            <span className="radio" />
            {ESTADO_LABEL[estado]}
          </button>
        ))}
      </div>
      {casoEnEstadoFinal && (
        <p className="empty-hint" style={{ marginTop: 10 }}>
          Este caso está en un estado final. Su lógica de reapertura aún está por definir.
        </p>
      )}
    </div>
  );
}
