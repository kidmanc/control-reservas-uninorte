import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PanelSidebar from '../../../components/layout/PanelSidebar';
import EstadoBadge from '../../../components/ui/EstadoBadge';
import TipoTag from '../../../components/ui/TipoTag';
import { IconPlus, IconSearch, IconUsers } from '../../../components/ui/icons';
import { useAuth } from '../../auth/AuthContext';
import { listCasos, listCasosParticipados } from '../api/casosApi';
import { listarDestinatarios } from '../../usuarios/api/usuariosApi';
import { ESTADOS, ESTADOS_ORDEN, ESTADO_LABEL, TIPOS_SOLICITUD, TIPO_SOLICITUD_TAG_LABEL } from '../constants';
import './ListaCasosPage.css';

const ESTADO_STAT_COLOR = {
  [ESTADOS.RECIBIDO]: 'var(--recibido)',
  [ESTADOS.EN_REVISION]: 'var(--revision)',
  [ESTADOS.FALTA_DOCUMENTACION]: 'var(--amarillo)',
  [ESTADOS.APROBADO]: 'var(--verde)',
};

export default function ListaCasosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Quien opera en el flujo solo ve sus casos asignados (lo filtra el backend).
  const esOperador = ['revisor', 'centro_medico', 'aprobador'].includes(user?.rol);
  const [casos, setCasos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState(null); // null = todos
  const [filtroTipo, setFiltroTipo] = useState(null);
  const [soloTerceros, setSoloTerceros] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [destinatarios, setDestinatarios] = useState([]);

  // Mapa id -> usuario para mostrar quién tiene cada caso (columna Asignado).
  const mapaDestinatarios = useMemo(
    () => Object.fromEntries(destinatarios.map((d) => [d.id, d])),
    [destinatarios],
  );

  useEffect(() => {
    let vigente = true;
    const principal = listCasos();
    // Para quien opera en el flujo, la bandeja incluye su historial (casos que
    // ya tuvo en sus manos): todo vive en una sola lista con los filtros.
    const historial = esOperador ? listCasosParticipados().catch(() => []) : Promise.resolve([]);
    const usuarios = listarDestinatarios().catch(() => []);
    Promise.all([principal, historial, usuarios])
      .then(([data, hist, dirs]) => {
        if (vigente) {
          setCasos(esOperador ? [...data, ...hist] : data);
          setDestinatarios(dirs);
          setCargando(false);
        }
      })
      .catch((err) => {
        if (vigente) {
          setErrorCarga(err.message || 'No se pudieron cargar los casos.');
          setCargando(false);
        }
      });
    return () => {
      vigente = false;
    };
  }, [esOperador]);

  const conteos = useMemo(() => {
    const base = { total: casos.length };
    for (const estado of ESTADOS_ORDEN) {
      base[estado] = casos.filter((c) => c.estado === estado).length;
    }
    return base;
  }, [casos]);

  function pasaFiltros(c) {
    if (filtroEstado && c.estado !== filtroEstado) return false;
    if (filtroTipo && c.tipo_solicitud !== filtroTipo) return false;
    if (soloTerceros && !c.tercero) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const coincide =
        c.nombre_completo.toLowerCase().includes(q) ||
        c.codigo_estudiantil.toLowerCase().includes(q) ||
        c.correo_institucional.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q);
      if (!coincide) return false;
    }
    return true;
  }

  const casosFiltrados = useMemo(
    () => casos.filter(pasaFiltros),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [casos, filtroEstado, filtroTipo, soloTerceros, busqueda],
  );

  return (
    <div className="panel-layout">
      <PanelSidebar />
      <main className="main-panel">
        <div className="panel-header">
          <div>
            <h1>Casos especiales</h1>
            <div className="sub">
              {esOperador
                ? 'Tus casos en mano y los que ya revisaste'
                : 'Reservas de matrícula por causa especial y devoluciones — gestión y trazabilidad'}
            </div>
          </div>
          {!esOperador && (
            <button className="btn-primary" style={{ background: 'var(--negro)' }} onClick={() => navigate('/panel/casos/nueva')}>
              <IconPlus />
              Nuevo caso manual
            </button>
          )}
        </div>

        <div className="stats-row">
          <button className={`stat-card${!filtroEstado ? ' filter-active' : ''}`} onClick={() => setFiltroEstado(null)}>
            <div className="stat-num">{conteos.total}</div>
            <div className="stat-label">Todos los casos</div>
            <div className="stat-bar" style={{ background: 'var(--negro)' }} />
          </button>
          {[ESTADOS.RECIBIDO, ESTADOS.EN_REVISION, ESTADOS.FALTA_DOCUMENTACION, ESTADOS.APROBADO].map((estado) => (
            <button
              key={estado}
              className={`stat-card${filtroEstado === estado ? ' filter-active' : ''}`}
              onClick={() => setFiltroEstado(estado)}
            >
              <div className="stat-num" style={{ color: ESTADO_STAT_COLOR[estado] }}>
                {conteos[estado]}
              </div>
              <div className="stat-label">{ESTADO_LABEL[estado]}</div>
              <div className="stat-bar" style={{ background: ESTADO_STAT_COLOR[estado] }} />
            </button>
          ))}
        </div>

        <div className="type-filter-row">
          <button className={`type-chip${!filtroTipo ? ' active' : ''}`} onClick={() => setFiltroTipo(null)}>
            <span className="swatch" style={{ background: !filtroTipo ? 'white' : 'var(--text-secondary)' }} />
            Todos los tipos
          </button>
          {Object.values(TIPOS_SOLICITUD).map((tipo) => (
            <button
              key={tipo}
              className={`type-chip${filtroTipo === tipo ? ' active' : ''}`}
              onClick={() => setFiltroTipo(tipo)}
            >
              <span className="swatch" style={{ background: tipo === TIPOS_SOLICITUD.RESERVA_MATRICULA ? 'var(--azul)' : '#6b3fa0' }} />
              {TIPO_SOLICITUD_TAG_LABEL[tipo] === 'Reserva' ? 'Reserva de matrícula' : TIPO_SOLICITUD_TAG_LABEL[tipo]}
            </button>
          ))}
          <button className={`type-chip${soloTerceros ? ' active' : ''}`} onClick={() => setSoloTerceros((v) => !v)}>
            <IconUsers width="13" height="13" />
            Diligenciado por tercero
          </button>
        </div>

        <div className="toolbar">
          <div className="search-input">
            <IconSearch />
            <input
              type="text"
              placeholder="Buscar por nombre, código o correo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        <div className="case-table">
          <div className="case-row header-row">
            <span>Caso</span>
            <span>Estudiante</span>
            <span>Tipo</span>
            <span>Programa</span>
            <span>Periodo</span>
            <span>Estado</span>
            <span>Asignado</span>
            <span></span>
          </div>

          {cargando && <div className="empty-row">Cargando casos…</div>}
          {errorCarga && (
            <div className="empty-row" style={{ color: 'var(--rechazado)' }}>{errorCarga}</div>
          )}
          {!cargando && !errorCarga && casosFiltrados.length === 0 && (
            <div className="empty-row">No hay casos que coincidan con estos filtros.</div>
          )}

          {!cargando &&
            casosFiltrados.map((caso) => (
              <FilaCaso
                key={caso.id}
                caso={caso}
                tenedor={mapaDestinatarios[caso.revisor_asignado_id]}
                onAbrir={(id) => navigate(`/panel/casos/${id}`)}
              />
            ))}
        </div>
      </main>
    </div>
  );
}

function FilaCaso({ caso, tenedor, onAbrir }) {
  return (
    <button className="case-row" onClick={() => onAbrir(caso.id)}>
      <span className="case-code">{caso.id}</span>
      <div className="case-student">
        {caso.nombre_completo}
        <div className="meta">{caso.codigo_estudiantil}</div>
      </div>
      <TipoTag tipo={caso.tipo_solicitud} />
      <span className="case-meta-text">{caso.programa_academico}</span>
      <span className="case-meta-text">{caso.periodo_academico}</span>
      <EstadoBadge estado={caso.estado} />
      {tenedor ? (
        <div className="avatar-mini" title={`${tenedor.nombre} tiene el caso`}>
          {tenedor.iniciales}
        </div>
      ) : (
        <div className="avatar-mini" title="En Tesorería (sin asignar)" style={{ background: '#e9e4d8', color: '#7a766c' }}>
          T
        </div>
      )}
      {caso.tercero ? (
        <div className="third-party-flag" title="Diligenciado por un tercero">
          <IconUsers />
        </div>
      ) : (
        <span />
      )}
    </button>
  );
}
