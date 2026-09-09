import { useState } from 'react';
import { ESTADOS_FINALES, ESTADO_LABEL } from '../constants';
import { IconUsers } from '../../../components/ui/icons';
import './RemitirCard.css';

// Refleja la tabla PASOS_FLUJO del backend: tenedor actual -> pasos válidos.
// El backend impone la tabla; aquí solo se muestran los pasos permitidos.
const ROL_LABEL = {
  revisor: 'Revisión y ejecución',
  centro_medico: 'Centro Médico',
  aprobador: 'Aprobación final',
};

// Qué espera Tesorería de quien tiene el caso.
const ESPERA_POR_ROL = {
  centro_medico: 'esperando su visto bueno sobre los documentos.',
  revisor: 'esperando confirmación de que ya ejecutó en la otra plataforma.',
  aprobador: 'esperando su aprobación final.',
};

function pasosValidos(tenedor, destinatarios, caso) {
  const rolTenedor = tenedor?.rol || null;

  // En Tesorería: al Centro Médico o a revisión y ejecución. Cada paso trae
  // sus candidatos; la opción muestra solo el paso, sin nombres de personas.
  if (rolTenedor === null) {
    const pasos = [];
    const revision = destinatarios.filter((d) => d.rol === 'revisor');
    const medicos = destinatarios.filter((d) => d.rol === 'centro_medico');
    if (revision.length > 0) {
      pasos.push({
        clave: 'revisor',
        etiqueta: `Enviar a ${ROL_LABEL.revisor}`,
        candidatos: revision,
        esDevolucion: false,
        veredicto: null,
        requiereMotivo: false,
      });
    }
    if (medicos.length > 0) {
      pasos.push({
        clave: 'centro_medico',
        etiqueta: `Enviar a ${ROL_LABEL.centro_medico}`,
        candidatos: medicos,
        esDevolucion: false,
        veredicto: null,
        requiereMotivo: false,
      });
    }
    return pasos;
  }

  // Centro Médico: aprueba o rechaza los documentos (solo rechazar pide motivo).
  if (rolTenedor === 'centro_medico') {
    return [
      {
        clave: 'aprobar',
        etiqueta: 'Aprobar',
        candidatos: [],
        esDevolucion: true,
        veredicto: 'documentos_validos',
        requiereMotivo: false,
      },
      {
        clave: 'rechazar',
        etiqueta: 'Rechazar',
        candidatos: [],
        esDevolucion: true,
        veredicto: 'documentos_no_validos',
        requiereMotivo: true,
      },
    ];
  }

  // Revisión y ejecución: la revisión se hace en otra plataforma; aquí solo
  // confirma que ya ejecutó y envía a aprobación final, o devuelve con correcciones.
  if (rolTenedor === 'revisor') {
    const pasos = [];
    const aprobadores = destinatarios.filter((d) => d.rol === 'aprobador');
    if (aprobadores.length > 0) {
      pasos.push({
        clave: 'aprobador',
        etiqueta: `Confirmar ejecución y enviar a ${ROL_LABEL.aprobador}`,
        candidatos: aprobadores,
        esDevolucion: false,
        veredicto: null,
        requiereMotivo: false,
      });
    }
    pasos.push({
      clave: 'tesoreria',
      etiqueta: 'Devolver con correcciones',
      candidatos: [],
      esDevolucion: true,
      veredicto: 'con_correcciones',
      requiereMotivo: true,
    });
    return pasos;
  }

  // Aprobador final: solo devuelve a quien se lo envió, con correcciones.
  // El backend lo impone; aquí se preselecciona esa persona.
  if (rolTenedor === 'aprobador') {
    const remitente =
      destinatarios.find((d) => d.id === caso.remitido_por_id && d.rol === 'revisor') || null;
    const candidatos = remitente
      ? [remitente]
      : destinatarios.filter((d) => d.rol === 'revisor');
    if (candidatos.length === 0) return [];
    return [
      {
        clave: 'revisor',
        etiqueta: `Devolver con correcciones a ${ROL_LABEL.revisor}`,
        candidatos,
        esDevolucion: true,
        veredicto: 'con_correcciones',
        requiereMotivo: true,
      },
    ];
  }

  return [];
}

function nombreTenedor(tenedor) {
  if (!tenedor) return 'Tesorería';
  return `${tenedor.nombre} (${ROL_LABEL[tenedor.rol] || tenedor.rol})`;
}

export default function RemitirCard({ caso, destinatarios, onRemitir, remitiendo, actor }) {
  const [indice, setIndice] = useState('');
  const [persona, setPersona] = useState('');
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
  // Si el paso tiene varias personas, hay que escoger cuál lo recibe;
  // con una sola se usa directamente sin preguntar. Ojo: Number('') es 0,
  // por eso sin selección explícita no se elige a nadie.
  const candidatos = paso?.candidatos || [];
  const personaElegida =
    candidatos.length <= 1
      ? candidatos[0] || null
      : persona === '' ? null : candidatos[Number(persona)] || null;

  function onElegirPaso(valor) {
    setIndice(valor);
    setPersona('');
  }

  function onConfirmar() {
    if (!paso || faltaMotivo) return;
    if (candidatos.length > 1 && !personaElegida) return;
    onRemitir(
      personaElegida ? personaElegida.id : null,
      paso.requiereMotivo ? motivo.trim() : null,
      paso.veredicto,
    );
    setIndice('');
    setPersona('');
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
          <label>{tenedor?.rol === 'centro_medico' ? 'Decisión' : 'Siguiente paso'}</label>
          <select value={indice} disabled={remitiendo} onChange={(e) => onElegirPaso(e.target.value)}>
            <option value="">Selecciona una opción</option>
            {pasos.map((p, i) => (
              <option key={`${p.clave}-${i}`} value={i}>
                {p.etiqueta}
              </option>
            ))}
          </select>
        </div>

        {candidatos.length > 1 && (
          <div className="remit-field">
            <label>Persona que lo recibe</label>
            <select value={persona} disabled={remitiendo} onChange={(e) => setPersona(e.target.value)}>
              <option value="">Selecciona la persona</option>
              {candidatos.map((c, i) => (
                <option key={c.id} value={i}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

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
            disabled={remitiendo || !paso || faltaMotivo || (candidatos.length > 1 && !personaElegida)}
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