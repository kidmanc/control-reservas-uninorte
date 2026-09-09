import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import PanelSidebar from '../../../components/layout/PanelSidebar';
import EstadoBadge from '../../../components/ui/EstadoBadge';
import TipoTag from '../../../components/ui/TipoTag';
import { IconBack, IconUsers } from '../../../components/ui/icons';
import { useAuth } from '../../auth/AuthContext';
import { getCaso, cambiarEstado, agregarComentario, obtenerArchivo, actualizarCasoDecision, remitirCaso, subirArchivoInterno } from '../api/casosApi';
import { listarDestinatarios } from '../../usuarios/api/usuariosApi';
import { NIVELES_ACADEMICOS, NIVEL_ACADEMICO_LABEL, TIPOS_SOLICITUD, ESTADOS_FINALES } from '../constants';
import StatusChanger from '../components/StatusChanger';
import RemitirCard from '../components/RemitirCard';
import FilesSidebar from '../components/FilesSidebar';
import CommentComposer from '../components/CommentComposer';
import DetalleTabs from '../components/DetalleTabs';
import DecisionCard from '../components/DecisionCard';
import './DetalleCasoPage.css';

function formatFecha(iso) {
  return new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DetalleCasoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caso, setCaso] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [guardandoDecision, setGuardandoDecision] = useState(false);
  const [destinatarios, setDestinatarios] = useState([]);
  const [remitiendo, setRemitiendo] = useState(false);
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [adjuntandoArchivo, setAdjuntandoArchivo] = useState(false);
  const [archivoAbriendoId, setArchivoAbriendoId] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await getCaso(id);
      setCaso(data);
      setErrorCarga(null);
    } catch (err) {
      setErrorCarga(err.message || 'No se pudo cargar el caso.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    setCargando(true);
    cargar();
  }, [cargar]);

  // Quien ve el detalle (Tesorería o tenedor) necesita la lista de destinatarios
  // para mostrar el tenedor actual y los pasos válidos del flujo.
  useEffect(() => {
    listarDestinatarios()
      .then(setDestinatarios)
      .catch(() => setDestinatarios([]));
  }, []);

  async function onCambiarEstado(nuevoEstado) {
    setCambiandoEstado(true);
    setErrorAccion(null);
    try {
      const actualizado = await cambiarEstado(id, nuevoEstado);
      setCaso(actualizado);
    } catch (err) {
      setErrorAccion(err.message || 'No se pudo cambiar el estado.');
    } finally {
      setCambiandoEstado(false);
    }
  }

  async function onCambiarDecision(cambios) {
    setGuardandoDecision(true);
    setErrorAccion(null);
    try {
      const actualizado = await actualizarCasoDecision(id, cambios);
      setCaso(actualizado);
    } catch (err) {
      setErrorAccion(err.message || 'No se pudo guardar la decisión.');
    } finally {
      setGuardandoDecision(false);
    }
  }

  async function onRemitir(revisorId, motivo, veredicto) {
    setRemitiendo(true);
    setErrorAccion(null);
    try {
      const actualizado = await remitirCaso(id, revisorId, motivo, veredicto);
      setCaso(actualizado);
    } catch (err) {
      setErrorAccion(err.message || 'No se pudo mover el caso.');
    } finally {
      setRemitiendo(false);
    }
  }

  async function onAgregarComentario(comentario) {
    setEnviandoComentario(true);
    setErrorAccion(null);
    try {
      const actualizado = await agregarComentario(id, {
        ...comentario,
        autor: user?.nombre || 'Asistente de Tesorería',
      });
      setCaso(actualizado);
    } catch (err) {
      setErrorAccion(err.message || 'No se pudo guardar el comentario.');
    } finally {
      setEnviandoComentario(false);
    }
  }

  async function onAdjuntarArchivo(datos) {
    if (!datos) {
      setErrorAccion('Archivo no válido. Usa PDF, imagen o Excel (XLS, XLSX, CSV) de máximo 10 MB.');
      return;
    }
    setAdjuntandoArchivo(true);
    setErrorAccion(null);
    try {
      const actualizado = await subirArchivoInterno(id, datos);
      setCaso(actualizado);
    } catch (err) {
      setErrorAccion(err.message || 'No se pudo adjuntar el documento.');
    } finally {
      setAdjuntandoArchivo(false);
    }
  }

  async function onVerArchivo(archivo) {
    const ventana = window.open('', '_blank');
    setArchivoAbriendoId(archivo.id);
    setErrorAccion(null);
    try {
      const blob = await obtenerArchivo(caso.db_id, archivo.id);
      const url = URL.createObjectURL(blob);
      if (ventana) {
        ventana.location.href = url;
      } else {
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = archivo.nombre_archivo;
        enlace.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      ventana?.close();
      setErrorAccion(err.message || 'No se pudo obtener el archivo.');
    } finally {
      setArchivoAbriendoId(null);
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

  if (errorCarga) {
    return (
      <div className="panel-layout">
        <PanelSidebar />
        <main className="main-panel">
          <p className="not-found-state" style={{ color: 'var(--rechazado)' }}>{errorCarga}</p>
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

  const esAdmin = user?.rol === 'admin';
  const esAsistente = user?.rol === 'asistente_tesoreria';
  const esAprobador = user?.rol === 'aprobador';

  // Quien opera en el flujo solo comenta sus casos en mano (el historial es lectura).
  const esTenedor =
    caso.revisor_asignado_id == null
      ? user?.rol === 'admin' || user?.rol === 'asistente_tesoreria'
      : caso.revisor_asignado_id === user?.id;
  const esRestringido = ['revisor', 'centro_medico', 'aprobador'].includes(user?.rol);
  const puedeComentar = !esRestringido || esTenedor;

  // Quién puede gestionar estado y liquidación:
  // - Estado: admin siempre; asistente solo en Tesorería no finalizados;
  //   aprobador solo finales en sus casos en mano.
  // - Liquidación (porcentaje/destino/nivel): admin siempre; asistente en
  //   Tesorería no finalizados. El aprobador solo aprueba/rechaza, no liquida;
  //   el revisor solo confirma ejecución. Nadie toca casos ajenos.
  const finalizado = ESTADOS_FINALES.includes(caso.estado);
  const enTesoreria = caso.revisor_asignado_id == null;
  const puedeGestionar =
    user?.rol === 'admin' ||
    (!finalizado &&
      ((user?.rol === 'asistente_tesoreria' && enTesoreria) ||
        (user?.rol === 'aprobador' && esTenedor)));
  const puedeEditarDecision =
    user?.rol === 'admin' ||
    (!finalizado && user?.rol === 'asistente_tesoreria' && enTesoreria);

  // Adjuntar documentos del equipo: admin siempre; asistente en Tesorería
  // no finalizados (para pasarle soportes al revisor antes de remitir).
  const puedeAdjuntar =
    user?.rol === 'admin' ||
    (!finalizado && user?.rol === 'asistente_tesoreria' && enTesoreria);

  // Aprobar exige liquidación previa del asistente: porcentaje y destino si es devolución.
  const puedeAprobar =
    caso.porcentaje_aplicado != null &&
    (caso.tipo_solicitud !== TIPOS_SOLICITUD.DEVOLUCION || caso.destino_devolucion != null);

  const HINT_POR_ROL = {
    revisor: 'Este caso está en tus manos para ejecución. Confirma que ya ejecutaste en la otra plataforma y envíalo a aprobación final, o devuélvelo a Tesorería con el motivo.',
    centro_medico: 'Este caso está en tus manos para validación médica. Revisa los soportes y devuélvelo a Tesorería con tu veredicto.',
    aprobador: 'Este caso está en tus manos para aprobación final. La liquidación ya la registró Tesorería: solo aprueba o rechaza, o devuélvelo con el motivo.',
  };

  return (
    <div className="panel-layout">
      <PanelSidebar />
      <main className="main-panel">
        <button className="back-link" onClick={() => navigate('/panel')}>
          <IconBack />
          Volver a todos los casos
        </button>

        <Link
          to={`/seguimiento/${caso.id}`}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12.5, color: 'var(--azul)', fontWeight: 600, display: 'inline-block', marginBottom: 16 }}
        >
          Ver como lo ve el estudiante ↗
        </Link>

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
                  <div className="label">Nivel académico</div>
                  <select
                    className="detalle-select"
                    value={caso.nivel_academico || NIVELES_ACADEMICOS.PREGRADO}
                    disabled={!puedeEditarDecision}
                    title={!puedeEditarDecision ? 'La liquidación la registra el asistente de Tesorería' : undefined}
                    onChange={(e) => onCambiarDecision({ nivel_academico: e.target.value })}
                  >
                    {Object.values(NIVELES_ACADEMICOS).map((n) => (
                      <option key={n} value={n}>
                        {NIVEL_ACADEMICO_LABEL[n]}
                      </option>
                    ))}
                  </select>
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

            <DetalleTabs
              caso={caso}
              onVerArchivo={onVerArchivo}
              archivoAbriendoId={archivoAbriendoId}
            />
          </div>

          {/* Columna derecha */}
            <div>
            {errorAccion && <div className="form-error" style={{ marginBottom: 16 }}>{errorAccion}</div>}
            {esTenedor && HINT_POR_ROL[user?.rol] && (
              <div className="sidebar-card">
                <p className="empty-hint" style={{ marginBottom: 0 }}>
                  {HINT_POR_ROL[user?.rol]}
                </p>
              </div>
            )}
            <RemitirCard
              caso={caso}
              destinatarios={destinatarios}
              onRemitir={onRemitir}
              remitiendo={remitiendo}
              actor={user}
            />
            {puedeGestionar && (
              <StatusChanger
                estadoActual={caso.estado}
                onCambiar={onCambiarEstado}
                cambiando={cambiandoEstado}
                esAdmin={esAdmin}
                soloFinales={esAprobador}
                soloNoFinales={esAsistente}
                puedeAprobar={puedeAprobar}
              />
            )}
            {puedeGestionar && (
              <DecisionCard
                caso={caso}
                onCambiar={onCambiarDecision}
                guardando={guardandoDecision}
                soloLectura={!puedeEditarDecision}
              />
            )}
            <FilesSidebar
              archivos={caso.archivos}
              onVerArchivo={onVerArchivo}
              archivoAbriendoId={archivoAbriendoId}
              puedeAdjuntar={puedeAdjuntar}
              onAdjuntar={onAdjuntarArchivo}
              adjuntando={adjuntandoArchivo}
            />
            {puedeComentar && (
              <CommentComposer comentarios={caso.comentarios} onAgregar={onAgregarComentario} enviando={enviandoComentario} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
