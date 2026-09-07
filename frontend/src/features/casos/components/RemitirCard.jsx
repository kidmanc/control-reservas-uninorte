import { useState } from 'react';
import { ESTADOS_FINALES, ESTADO_LABEL } from '../constants';
import { IconUsers } from '../../../components/ui/icons';
import './RemitirCard.css';

// Refleja la tabla PASOS_FLUJO del backend: tenedor actual -> pasos válidos.
// El backend impone la tabla; aquí solo se muestran los pasos permitidos.
const ROL_LABEL = {
  revisor: 'Revisión de detalle',
  centro_medico: 'Centro Médico',
  aprobador: 'Aprobación final',
};

// Qué espera Tesorería de quien tiene el caso.
const ESPERA_POR_ROL = {
  centro_medico: 'esperando su visto bueno sobre los documentos.',
  revisor: 'esperando su revisión (enviar a aprobación o devolver con correcciones).',
  aprobador: 'esperando su aprobación final.',
};

function pasosValidos(tenedor, destinatarios, caso) {
  const rolTenedor = tenedor?.rol || null;

  // En Tesorería: al Centro Médico o a revisión de detalle (solo nombres).
  if (rolTenedor === null) {
    return destinatarios
      .filter((d) => d.rol === 'revisor' || d.rol === 'centro_medico')
      .map((d) => ({
        revisor_id: d.id,
        etiqueta: d.nombre,
        esDevolucion: false,
        veredicto: null,
        requiereMotivo: false,
      }));
  }

  // Centro Médico: aprueba o rechaza los documentos (solo rechazar pide motivo).
  if (rolTenedor === 'centro_medico') {
    return [
      {
        revisor_id: null,
        etiqueta: 'Aprobar',
        esDevolucion: true,
        veredicto: 'documentos_validos',
        requiereMotivo: false,
      },
      {
        revisor_id: null,
        etiqueta: 'Rechazar',
        esDevolucion: true,
        veredicto: 'documentos_no_validos',
        requiereMotivo: true,
      },
    ];
  }

  // Revisión de detalle: a aprobación final o de vuelta con correcciones.
  if (rolTenedor === 'revisor') {
    const adelantes = destinatarios
      .filter((d) => d.rol === 'aprobador')
      .map((d) => ({
        revisor_id: d.id,
        etiqueta: d.nombre,
        esDevolucion: false,
        veredicto: null,
        requiereMotivo: false,
      }));
    return [
      ...adelantes,
      {
        revisor_id: null,
        etiqueta: 'Devolver con correcciones',
        esDevolucion: true,
        veredicto: 'con_correcciones',
        requiereMotivo: true,
      },
    ];
  }

  // Aprobador final: solo devuelve a quien se lo envió, con correcciones.
  if (rolTenedor === 'aprobador') {
    const remitente =
      destinatarios.find((d) => d.id === caso.remitido_por_id && d.rol === 'revisor') || null;
    if (remitente) {
      return [
        {
          revisor_id: remitente.id,
          etiqueta: `Devolver con correcciones a ${remitente.nombre}`,
          esDevolucion: true,
          veredicto: 'con_correcciones',
          requiereMotivo: true,
        },
      ];
    }
    return destinatarios
      .filter((d) => d.rol === 'revisor')
      .map((d) => ({
        revisor_id: d.id,
        etiqueta: `Devolver con correcciones a ${d.nombre}`,
        esDevolucion: true,
        veredicto: 'con_correcciones',
        requiereMotivo: true,
      }));
  }

  return [];
}

function nombreTenedor(tenedor) {
  if (!tenedor) return 'Tesorería';
  return `${tenedor.nombre} (${ROL_LABEL[tenedor.rol] || tenedor.rol})`;
}

export default function RemitirCard({ caso, destinatarios, onRemitir, remitiendo, actor }) {
  const [indice, setIndice] = useState('');
  const [motivo, setMotivo] = useState('');

  const esTesoreria = actor?.rol === 'admin' || actor?.rol === 'asistente_tesoreria';
  const esTenedor =
    caso.revisor_asignado_id == null ? esTesoreria : caso.revisor_asignado_id === actor?.id;
  const esAdmin = actor?.rol === 'admin';
  const finalizado = ESTADOS_FINALES.includes(caso.estado);

  const tenedor = destinatarios.find((d) => d.id === caso.revisor_asignado_id) || null;
  const pasos = pasosValidos(tenedor, destinatarios, caso);
  const paso = indice === '' ? null : pasos[Number(indice)];
  const faltaMotivo = Boolean(paso && paso.requiereMotivo && !motivo.trim());

  function onConfirmar() {
    if (!paso || faltaMotivo) return;
    onRemitir(paso.revisor_id, paso.requiereMotivo ? motivo.trim() : null, paso.veredicto);
    setIndice('');
    setMotivo('');
  }

  function renderPasos() {
    if (pasos.length === 0) {
      return (
        <p className="empty-hint" style={{ marginTop: 10 }}>
          {esTesoreria
            ? 'No hay cuentas disponibles para este paso (falta crear revisión, Centro Médico o aprobación). La tesorera puede crearlas en Gestión de usuarios.'
            : 'No hay pasos disponibles desde aquí. Pídelo a Tesorería.'}
        </p>
      );
    }
    return (
      <>
        <div className="remit-field">
          <label>{tenedor?.rol === 'centro_medico' ? 'Decisión' : 'Remitir a'}</label>
          <select value={indice} disabled={remitiendo} onChange={(e) => setIndice(e.target.value)}>
            <option value="">Selecciona una opción</option>
            {pasos.map((p, i) => (
              <option key={`${p.revisor_id}-${p.veredicto}-${i}`} value={i}>
                {p.etiqueta}
              </option>
            ))}
          </select>
        </div>

        {paso?.requiereMotivo && (
          <div className="remit-field">
            <label>Motivo de la devolución</label>
            <textarea
              className="remit-motivo"
              placeholder="Explica el resultado o qué se debe corregir (obligatorio, queda en el historial)"
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
    );
  }

  return (
    <div className="sidebar-card">
      <h3>
        <IconUsers />
        Recorrido del caso
      </h3>

      <p className="empty-hint">
        En manos de: <strong>{nombreTenedor(tenedor)}</strong>
      </p>

      {finalizado && !esAdmin && (
        <p className="empty-hint" style={{ marginTop: 8 }}>
          Caso finalizado ({ESTADO_LABEL[caso.estado].toLowerCase()}): sin movimientos. Solo la tesorera puede reabrirlo.
        </p>
      )}

      {esTenedor && !(finalizado && !esAdmin) && renderPasos()}

      {!esTenedor && actor?.rol === 'admin' && tenedor && (
        <>
          <p className="empty-hint" style={{ marginTop: 8 }}>
            Está {ESPERA_POR_ROL[tenedor.rol] || 'en revisión.'}
          </p>
          <details className="remit-override">
            <summary>Actuar como Tesorería (override)</summary>
            {renderPasos()}
          </details>
        </>
      )}

      {!esTenedor && actor?.rol !== 'admin' && tenedor && esTesoreria && (
        <p className="empty-hint" style={{ marginTop: 8 }}>
          Está {ESPERA_POR_ROL[tenedor.rol] || 'en revisión.'} Solo la tesorera puede reasignarlo.
        </p>
      )}

      {!esTenedor && !esTesoreria && (
        <p className="empty-hint" style={{ marginTop: 8 }}>
          Ya participaste en este caso; ahora está en manos de {nombreTenedor(tenedor)}.
        </p>
      )}
    </div>
  );
}