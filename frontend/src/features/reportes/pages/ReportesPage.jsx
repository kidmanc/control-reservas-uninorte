import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PanelSidebar from '../../../components/layout/PanelSidebar';
import EstadoBadge from '../../../components/ui/EstadoBadge';
import TipoTag from '../../../components/ui/TipoTag';
import { obtenerResumen } from '../api/reportesApi';
import { ESTADOS, ESTADO_LABEL, TIPOS_SOLICITUD, TIPO_SOLICITUD_LABEL, DESTINO_DEVOLUCION_LABEL } from '../../casos/constants';
import './ReportesPage.css';

const UMBRALES = [3, 5, 7, 15, 30];

function formatoPct(valor) {
  if (valor == null) return '—';
  return `${Math.round(valor * 100)}%`;
}

export default function ReportesPage() {
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState({ periodo: '', tipo: '', desde: '', hasta: '' });
  const [umbral, setUmbral] = useState(7);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await obtenerResumen({
        periodo: filtros.periodo || undefined,
        tipo: filtros.tipo || undefined,
        desde: filtros.desde || undefined,
        hasta: filtros.hasta || undefined,
      });
      setResumen(data);
      setErrorCarga(null);
    } catch (err) {
      setErrorCarga(err.message || 'No se pudieron cargar los reportes.');
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const estancadosFiltrados = useMemo(() => {
    if (!resumen) return [];
    return resumen.estancados.filter((c) => c.dias_quieto >= umbral);
  }, [resumen, umbral]);

  function setFiltro(campo, valor) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  return (
    <div className="panel-layout">
      <PanelSidebar />
      <main className="main-panel">
        <div className="report-head">
          <div>
            <h1 className="report-title">Reportes</h1>
            <p className="report-sub">Totales, tiempos y casos quietos — solo Tesorería.</p>
          </div>
        </div>

        <div className="report-filters">
          <div className="report-filter">
            <label>Período</label>
            <select value={filtros.periodo} onChange={(e) => setFiltro('periodo', e.target.value)}>
              <option value="">Todos</option>
              {(resumen?.periodos || []).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="report-filter">
            <label>Tipo</label>
            <select value={filtros.tipo} onChange={(e) => setFiltro('tipo', e.target.value)}>
              <option value="">Todos</option>
              {Object.values(TIPOS_SOLICITUD).map((t) => (
                <option key={t} value={t}>{TIPO_SOLICITUD_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div className="report-filter">
            <label>Desde</label>
            <input type="date" value={filtros.desde} onChange={(e) => setFiltro('desde', e.target.value)} />
          </div>
          <div className="report-filter">
            <label>Hasta</label>
            <input type="date" value={filtros.hasta} onChange={(e) => setFiltro('hasta', e.target.value)} />
          </div>
          {(filtros.periodo || filtros.tipo || filtros.desde || filtros.hasta) && (
            <button
              type="button"
              className="report-clear"
              onClick={() => setFiltros({ periodo: '', tipo: '', desde: '', hasta: '' })}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {cargando && <div className="report-empty">Cargando reportes…</div>}
        {errorCarga && <div className="report-empty" style={{ color: 'var(--rechazado)' }}>{errorCarga}</div>}

        {!cargando && !errorCarga && resumen && (
          <>
            <div className="report-cards">
              <div className="report-card">
                <div className="report-num">{resumen.total}</div>
                <div className="report-label">Casos totales</div>
              </div>
              <div className="report-card">
                <div className="report-num">{resumen.por_estado[ESTADOS.RECIBIDO] ?? 0}</div>
                <div className="report-label">Recibidos</div>
              </div>
              <div className="report-card">
                <div className="report-num">{resumen.por_estado[ESTADOS.FALTA_DOCUMENTACION] ?? 0}</div>
                <div className="report-label">Falta documentación</div>
              </div>
              <div className="report-card ok">
                <div className="report-num">{resumen.por_estado[ESTADOS.APROBADO] ?? 0}</div>
                <div className="report-label">Aprobados</div>
              </div>
              <div className="report-card bad">
                <div className="report-num">{resumen.por_estado[ESTADOS.RECHAZADO] ?? 0}</div>
                <div className="report-label">Rechazados</div>
              </div>
              <div className="report-card">
                <div className="report-num">{formatoPct(resumen.tasa_aprobacion)}</div>
                <div className="report-label">Tasa de aprobación</div>
              </div>
              <div className="report-card">
                <div className="report-num">{resumen.promedio_porcentaje != null ? `${resumen.promedio_porcentaje}%` : '—'}</div>
                <div className="report-label">% promedio otorgado</div>
              </div>
              <div className="report-card">
                <div className="report-num">{resumen.promedio_dias_cierre != null ? `${resumen.promedio_dias_cierre} d` : '—'}</div>
                <div className="report-label">Promedio creación → cierre</div>
              </div>
            </div>

            <div className="report-grid">
              <section className="report-table-card">
                <h2>Por tipo de solicitud</h2>
                <div className="rtable">
                  <div className="rrow rhead">
                    <span>Tipo</span>
                    <span>Total</span>
                    <span>Aprobados</span>
                    <span>% prom.</span>
                  </div>
                  {Object.values(TIPOS_SOLICITUD).map((t) => {
                    const d = resumen.por_tipo_detalle[t] || {};
                    return (
                      <div className="rrow" key={t}>
                        <TipoTag tipo={t} />
                        <span className="rmeta">{d.total ?? 0}</span>
                        <span className="rmeta">{d.aprobados ?? 0}</span>
                        <span className="rmeta">{d.promedio_porcentaje != null ? `${d.promedio_porcentaje}%` : '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="report-table-card">
                <h2>Devoluciones por destino</h2>
                <div className="rtable">
                  <div className="rrow rhead">
                    <span>Destino</span>
                    <span>Casos</span>
                  </div>
                  {Object.entries(DESTINO_DEVOLUCION_LABEL).map(([valor, etiqueta]) => (
                    <div className="rrow" key={valor}>
                      <span className="rmeta">{etiqueta}</span>
                      <span className="rmeta">{resumen.devoluciones_por_destino[valor] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="report-table-card">
              <div className="estancados-head">
                <h2>Casos quietos ({estancadosFiltrados.length})</h2>
                <label className="umbral-label">
                  Desde
                  <select value={umbral} onChange={(e) => setUmbral(Number(e.target.value))}>
                    {UMBRALES.map((u) => (
                      <option key={u} value={u}>{u} días</option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="report-hint">Casos abiertos sin cambios desde hace al menos los días indicados.</p>
              {estancadosFiltrados.length === 0 ? (
                <div className="report-empty">No hay casos quietos para este umbral.</div>
              ) : (
                <div className="rtable">
                  <div className="rrow rhead">
                    <span>Caso</span>
                    <span>Estudiante</span>
                    <span>Estado</span>
                    <span>En manos de</span>
                    <span>Días quieto</span>
                  </div>
                  {estancadosFiltrados.map((c) => (
                    <button className="rrow rclick" key={c.id} onClick={() => navigate(`/panel/casos/${c.numero_caso}`)}>
                      <span className="rcode">{c.numero_caso}</span>
                      <span className="rmeta">{c.nombre_completo}</span>
                      <EstadoBadge estado={c.estado} />
                      <span className="rmeta">{c.tenedor_nombre || 'Tesorería'}</span>
                      <span className="rmeta"><strong>{c.dias_quieto}</strong></span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
