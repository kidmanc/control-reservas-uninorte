import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import EstadoBadge from '../../../components/ui/EstadoBadge';
import TipoTag from '../../../components/ui/TipoTag';
import { IconFile, IconUpload, IconWarning, IconReceived, IconCheckCircle } from '../../../components/ui/icons';
import { getCaso, agregarComentario, subirArchivoEstudiante } from '../api/casosApi';
import { ESTADOS, ESTADOS_FINALES } from '../constants';
import '../../casos/pages/FormularioCasoPage.css';
import './DetalleCasoPage.css';
import './SeguimientoCasoPage.css';

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

export default function SeguimientoCasoPage() {
  const { id } = useParams();
  const [caso, setCaso] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [respuesta, setRespuesta] = useState('');
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  const cargar = useCallback(async () => {
    const data = await getCaso(id);
    setCaso(data);
    setCargando(false);
  }, [id]);

  useEffect(() => {
    setCargando(true);
    cargar();
  }, [cargar]);

  async function onEnviarRespuesta() {
    if (!respuesta.trim()) return;
    setEnviandoRespuesta(true);
    try {
      // Todo lo que escribe el estudiante/tercero queda visible para Tesorería por definición.
      const actualizado = await agregarComentario(id, {
        texto: respuesta.trim(),
        visible_para_estudiante: true,
        autor: caso.tercero ? caso.tercero.nombre_completo : caso.nombre_completo,
      });
      setCaso(actualizado);
      setRespuesta('');
    } finally {
      setEnviandoRespuesta(false);
    }
  }

  async function onSubirArchivo(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setSubiendoArchivo(true);
    try {
      const actualizado = await subirArchivoEstudiante(id, archivo);
      setCaso(actualizado);
    } finally {
      setSubiendoArchivo(false);
    }
  }

  if (cargando) {
    return (
      <div className="student-page">
        <StudentHeader />
        <p className="loading-state">Cargando tu solicitud…</p>
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="student-page">
        <StudentHeader />
        <div className="seguimiento-container">
          <p className="not-found-state">
            No encontramos ninguna solicitud con el código <strong>{id}</strong>. Verifica el enlace que
            recibiste por correo.
          </p>
        </div>
      </div>
    );
  }

  const comentariosVisibles = caso.comentarios.filter((c) => c.visible_para_estudiante);
  const esFinal = ESTADOS_FINALES.includes(caso.estado);

  return (
    <div className="student-page">
      <StudentHeader />

      <div className="seguimiento-container">
        <div className="seguimiento-top">
          <div>
            <h1>Seguimiento de tu solicitud</h1>
            <div className="subtitle">
              Caso {caso.id} · {caso.nombre_completo}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <TipoTag tipo={caso.tipo_solicitud} full size="lg" />
            <EstadoBadge estado={caso.estado} size="lg" />
          </div>
        </div>

        {caso.estado === ESTADOS.FALTA_DOCUMENTACION && (
          <div className="scope-note" style={{ background: 'var(--falta-bg)', border: '1px solid #f0e0a8' }}>
            <div className="icon-wrap" style={{ background: '#fbe9a8', color: '#8a6d00' }}>
              <IconWarning />
            </div>
            <div className="txt">
              <strong style={{ color: '#5c4700' }}>Necesitamos algo más de ti</strong>
              <p style={{ color: '#6e5900' }}>
                Revisa el comentario más reciente de Tesorería abajo y sube el documento solicitado en la sección
                "Tus documentos".
              </p>
            </div>
          </div>
        )}

        {esFinal && (
          <div className="scope-note" style={{ background: caso.estado === ESTADOS.APROBADO ? 'var(--verde-bg)' : 'var(--rechazado-bg)', border: 'none' }}>
            <div className="txt">
              <p style={{ color: caso.estado === ESTADOS.APROBADO ? '#1f7a4d' : '#b3413a', fontWeight: 600 }}>
                Tu solicitud fue {caso.estado === ESTADOS.APROBADO ? 'aprobada' : 'rechazada'}. Este es el estado
                final de tu caso en esta plataforma.
              </p>
            </div>
          </div>
        )}

        {/* Estado de la solicitud */}
        <div className="seguimiento-card">
          <h2>Estado de tu solicitud</h2>
          {[...caso.historial_estados].reverse().map((h) => {
            const cfg = ESTADO_DOT[h.estado_nuevo];
            return (
              <div className="timeline-item" key={h.id}>
                <div className="timeline-dot" style={{ background: cfg.bg }}>
                  {cfg.icon}
                </div>
                <div className="timeline-content">
                  <div className="timeline-title">
                    {h.estado_anterior ? `Estado cambiado a "${estadoLabel(h.estado_nuevo)}"` : 'Solicitud recibida'}
                  </div>
                  <div className="timeline-time">{formatFecha(h.fecha)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comentarios de Tesorería */}
        <div className="seguimiento-card">
          <h2>Comentarios de Tesorería</h2>
          {comentariosVisibles.length === 0 && <p className="empty-hint">Todavía no hay comentarios en tu caso.</p>}
          {comentariosVisibles.map((c) => (
            <div className="comment-item visible" key={c.id}>
              <div className="comment-head">
                <span className="comment-author">{c.autor}</span>
              </div>
              <div className="comment-text">{c.texto}</div>
              <div className="comment-time">{formatFecha(c.fecha)}</div>
            </div>
          ))}

          {!esFinal && (
            <div className="seguimiento-reply-box">
              <textarea
                placeholder="Escribe una respuesta para Tesorería..."
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
              />
              <div className="seguimiento-reply-actions">
                <button className="btn-primary" onClick={onEnviarRespuesta} disabled={enviandoRespuesta || !respuesta.trim()}>
                  {enviandoRespuesta ? 'Enviando...' : 'Enviar respuesta'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Documentos */}
        <div className="seguimiento-card">
          <h2>Tus documentos</h2>
          {caso.archivos.map((a) => (
            <div className="file-chip" key={a.id}>
              <div className="file-icon">
                <IconFile />
              </div>
              <div style={{ flex: 1 }}>
                <div className="file-name">{a.nombre_archivo}</div>
              </div>
            </div>
          ))}

          {!esFinal && (
            <div style={{ marginTop: 16 }}>
              <label className="upload-zone" style={{ display: 'block' }}>
                <div className="upload-icon">
                  <IconUpload />
                </div>
                <div className="main-text">{subiendoArchivo ? 'Subiendo...' : 'Arrastra un archivo aquí o haz clic para seleccionar'}</div>
                <div className="sub-text">PDF, JPG o PNG · máximo 10 MB por archivo</div>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} disabled={subiendoArchivo} onChange={onSubirArchivo} />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function estadoLabel(estado) {
  const labels = {
    [ESTADOS.RECIBIDO]: 'Recibido',
    [ESTADOS.EN_REVISION]: 'En revisión',
    [ESTADOS.FALTA_DOCUMENTACION]: 'Falta documentación',
    [ESTADOS.APROBADO]: 'Aprobado',
    [ESTADOS.RECHAZADO]: 'Rechazado',
  };
  return labels[estado];
}

function StudentHeader() {
  return (
    <header className="student-header">
      <div className="logo-mark">UN</div>
      <div>
        <div className="header-title">Tesorería · Universidad del Norte</div>
        <div className="header-sub">Casos especiales</div>
      </div>
    </header>
  );
}
