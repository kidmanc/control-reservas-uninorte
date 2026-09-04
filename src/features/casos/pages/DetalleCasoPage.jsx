import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PanelSidebar from '../../../components/layout/PanelSidebar';
import EstadoBadge from '../../../components/ui/EstadoBadge';
import TipoTag from '../../../components/ui/TipoTag';
import { IconBack, IconUsers } from '../../../components/ui/icons';
import { getCaso, cambiarEstado, agregarComentario } from '../api/casosApi';
import StatusChanger from '../components/StatusChanger';
import FilesSidebar from '../components/FilesSidebar';
import CommentComposer from '../components/CommentComposer';
import DetalleTabs from '../components/DetalleTabs';
import './DetalleCasoPage.css';

function formatFecha(iso) {
  return new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DetalleCasoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caso, setCaso] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  const cargar = useCallback(async () => {
    const data = await getCaso(id);
    setCaso(data);
    setCargando(false);
  }, [id]);

  useEffect(() => {
    setCargando(true);
    cargar();
  }, [cargar]);

  async function onCambiarEstado(nuevoEstado) {
    setCambiandoEstado(true);
    try {
      const actualizado = await cambiarEstado(id, nuevoEstado);
      setCaso(actualizado);
    } finally {
      setCambiandoEstado(false);
    }
  }

  async function onAgregarComentario(comentario) {
    setEnviandoComentario(true);
    try {
      const actualizado = await agregarComentario(id, comentario);
      setCaso(actualizado);
    } finally {
      setEnviandoComentario(false);
    }
  }

  if (cargando) {
    return (
      <div className="panel-layout">
        <PanelSidebar />
        <main className="main-panel">
          <p className="loading-state">Cargando caso…</p>
        </main>
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="panel-layout">
        <PanelSidebar />
        <main className="main-panel">
          <p className="not-found-state">No encontramos el caso {id}.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="panel-layout">
      <PanelSidebar />
      <main className="main-panel">
        <button className="back-link" onClick={() => navigate('/panel')}>
          <IconBack />
          Volver a todos los casos
        </button>

        <div className="detail-grid">
          {/* Columna izquierda */}
          <div>
            <div className="detail-card">
              <div className="detail-top">
                <div>
                  <h2>{caso.nombre_completo}</h2>
                  <div className="subtitle">
                    Caso {caso.id} · Creado el {formatFecha(caso.fecha_creacion)}
                  </div>
                </div>
                <div className="detail-badges">
                  <TipoTag tipo={caso.tipo_solicitud} full size="lg" />
                  <EstadoBadge estado={caso.estado} size="lg" />
                </div>
              </div>

              {caso.tercero && (
                <div className="third-party-banner">
                  <div className="icon-wrap">
                    <IconUsers />
                  </div>
                  <div>
                    <strong>Solicitud diligenciada por un tercero</strong>
                    <p>
                      {caso.tercero.nombre_completo} ({caso.tercero.parentesco}) · {caso.tercero.documento_identidad} ·
                      Tel. {caso.tercero.telefono_contacto} — el estudiante se encontraba impedido para completar la
                      solicitud. Soporte de representación adjunto en la sección de archivos.
                    </p>
                  </div>
                </div>
              )}

              <div className="info-grid">
                <div className="info-item">
                  <div className="label">Código estudiantil</div>
                  <div className="value">{caso.codigo_estudiantil}</div>
                </div>
                <div className="info-item">
                  <div className="label">Correo institucional</div>
                  <div className="value">{caso.correo_institucional}</div>
                </div>
                <div className="info-item">
                  <div className="label">Teléfono</div>
                  <div className="value">{caso.telefono_contacto}</div>
                </div>
                <div className="info-item">
                  <div className="label">Programa académico</div>
                  <div className="value">{caso.programa_academico}</div>
                </div>
                <div className="info-item">
                  <div className="label">Periodo académico</div>
                  <div className="value">{caso.periodo_academico}</div>
                </div>
              </div>

              <div className="info-item" style={{ marginTop: 20 }}>
                <div className="label">Motivo de la solicitud</div>
                <div className="motivo-box">{caso.motivo}</div>
              </div>
            </div>

            <DetalleTabs caso={caso} />
          </div>

          {/* Columna derecha */}
          <div>
            <StatusChanger estadoActual={caso.estado} onCambiar={onCambiarEstado} cambiando={cambiandoEstado} />
            <FilesSidebar archivos={caso.archivos} />
            <CommentComposer comentarios={caso.comentarios} onAgregar={onAgregarComentario} enviando={enviandoComentario} />
          </div>
        </div>
      </main>
    </div>
  );
}
