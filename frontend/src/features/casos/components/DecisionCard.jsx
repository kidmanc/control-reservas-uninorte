import { TIPOS_SOLICITUD, PORCENTAJES_POR_TIPO, DESTINO_DEVOLUCION_LABEL, DESTINOS_DEVOLUCION } from '../constants';
import { IconPercent } from '../../../components/ui/icons';
import './DecisionCard.css';

export default function DecisionCard({ caso, onCambiar, guardando }) {
  const opciones = PORCENTAJES_POR_TIPO[caso.tipo_solicitud] || [];
  const esDevolucion = caso.tipo_solicitud === TIPOS_SOLICITUD.DEVOLUCION;
  const porcentajeActual = caso.porcentaje_aplicado;

  return (
    <div className="sidebar-card">
      <h3>
        <IconPercent />
        Decisión de Tesorería
      </h3>
      <p className="empty-hint">Porcentaje aplicado para {esDevolucion ? 'la devolución' : 'la reserva de matrícula'}.</p>

      <div className="decision-select">
        {opciones.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            className={`decision-option${porcentajeActual === opcion.valor ? ' selected' : ''}`}
            disabled={guardando}
            onClick={() => onCambiar({ porcentaje_aplicado: opcion.valor })}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {esDevolucion && (
        <div className="decision-field">
          <label>Destino de la devolución</label>
          <select
            value={caso.destino_devolucion || ''}
            disabled={guardando}
            onChange={(e) => onCambiar({ destino_devolucion: e.target.value })}
          >
            <option value="">Selecciona el destino</option>
            {Object.values(DESTINOS_DEVOLUCION).map((destino) => (
              <option key={destino} value={destino}>
                {DESTINO_DEVOLUCION_LABEL[destino]}
              </option>
            ))}
          </select>
          <span className="decision-hint">A quién se entrega el dinero si la devolución se aprueba.</span>
        </div>
      )}
    </div>
  );
}