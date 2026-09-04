import { useState } from 'react';
import { ESTADO_LABEL, ESTADOS } from '../constants';
import { IconWarning, IconReceived, IconCheckCircle, IconFile } from '../../../components/ui/icons';

function formatFecha(iso) {
  return new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
}

const ESTADO_DOT = {
  [ESTADOS.RECIBIDO]: { bg: 'var(--recibido-bg)', icon: <IconReceived stroke="var(--recibido)" /> },
  [ESTADOS.EN_REVISION]: { bg: 'var(--revision-bg)', icon: <IconClockDot /> },
  [ESTADOS.FALTA_DOCUMENTACION]: { bg: 'var(--falta-bg)', icon: <IconWarning /> },
  [ESTADOS.APROBADO]: { bg: 'var(--verde-bg)', icon: <IconCheckCircle stroke="var(--verde)" /> },
  [ESTADOS.RECHAZADO]: { bg: 'var(--rechazado-bg)', icon: <IconWarning stroke="var(--rechazado)" /> },
};

function IconClockDot() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--revision)" strokeWidth="2.3">
      <path d="M11 4a7 7 0 100 14 7 7 0 000-14z" />
      <path d="M11 8v3l2 2" />
    </svg>
  );
}

export default function DetalleTabs({ caso }) {
  const [tab, setTab] = useState('trazabilidad');

  return (
    <div className="detail-card">
      <div className="tab-row">
        <button className={`tab-item${tab === 'trazabilidad' ? ' active' : ''}`} onClick={() => setTab('trazabilidad')}>
          Trazabilidad
        </button>
        <button className={`tab-item${tab === 'comentarios' ? ' active' : ''}`} onClick={() => setTab('comentarios')}>
          Comentarios ({caso.comentarios.length})
        </button>
        <button className={`tab-item${tab === 'archivos' ? ' active' : ''}`} onClick={() => setTab('archivos')}>
          Archivos ({caso.archivos.length})
        </button>
      </div>

      {tab === 'trazabilidad' && <Trazabilidad historial={caso.historial_estados} />}
      {tab === 'comentarios' && <Comentarios comentarios={caso.comentarios} />}
      {tab === 'archivos' && <Archivos archivos={caso.archivos} />}
    </div>
  );
}

function Trazabilidad({ historial }) {
  const ordenado = [...historial].reverse();
  return (
    <>
      {ordenado.map((h) => {
        const cfg = ESTADO_DOT[h.estado_nuevo];
        return (
          <div className="timeline-item" key={h.id}>
            <div className="timeline-dot" style={{ background: cfg.bg }}>
              {cfg.icon}
            </div>
            <div className="timeline-content">
              <div className="timeline-title">
                {h.estado_anterior ? `Estado cambiado a "${ESTADO_LABEL[h.estado_nuevo]}"` : 'Caso recibido'}
              </div>
              {h.descripcion && <div className="timeline-desc">{h.descripcion}</div>}
              <div className="timeline-time">
                {formatFecha(h.fecha)} · {h.cambiado_por}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

function Comentarios({ comentarios }) {
  if (comentarios.length === 0) {
    return <p className="empty-hint">Todavía no hay comentarios en este caso.</p>;
  }
  return (
    <>
      {comentarios.map((c) => (
        <div className={`comment-item ${c.visible_para_estudiante ? 'visible' : 'internal'}`} key={c.id}>
          <div className="comment-head">
            <span className="comment-author">{c.autor}</span>
            <span className={`comment-tag ${c.visible_para_estudiante ? 'visible' : 'internal'}`}>
              {c.visible_para_estudiante ? 'Visible al estudiante' : 'Interno'}
            </span>
          </div>
          <div className="comment-text">{c.texto}</div>
          <div className="comment-time">{formatFecha(c.fecha)}</div>
        </div>
      ))}
    </>
  );
}

function Archivos({ archivos }) {
  if (archivos.length === 0) {
    return <p className="empty-hint">Este caso todavía no tiene archivos adjuntos.</p>;
  }
  return (
    <>
      {archivos.map((a) => (
        <div className="attach-item" key={a.id}>
          <div className="attach-icon" style={{ background: 'var(--verde-bg)', color: 'var(--verde)' }}>
            <IconFile />
          </div>
          <div style={{ flex: 1 }}>
            <div className="attach-name">{a.nombre_archivo}</div>
            <div className="attach-desc">
              {a.descripcion ? `${a.descripcion} · ` : ''}
              Subido por {a.subido_por === 'tercero' ? 'el tercero' : 'el estudiante'} · {formatFecha(a.fecha)}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
