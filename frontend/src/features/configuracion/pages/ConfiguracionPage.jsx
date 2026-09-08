import { useCallback, useEffect, useState } from 'react';
import PanelSidebar from '../../../components/layout/PanelSidebar';
import { IconCheckCircle, IconUsers } from '../../../components/ui/icons';
import { useAuth } from '../../auth/AuthContext';
import { cambiarMiContrasena } from '../../usuarios/api/usuariosApi';
import { listarCatalogos, crearCatalogo, actualizarCatalogo, eliminarCatalogo } from '../api/catalogosApi';
import './ConfiguracionPage.css';

const ROL_LABEL = {
  admin: 'Tesorero',
  asistente_tesoreria: 'Asistente de Tesorería',
  revisor: 'Revisor de detalle',
  centro_medico: 'Centro Médico',
  aprobador: 'Aprobador final',
};

export default function ConfiguracionPage() {
  const { user } = useAuth();
  const esAdmin = user?.rol === 'admin';

  return (
    <div className="panel-layout">
      <PanelSidebar />
      <main className="main-panel">
        <div className="report-head">
          <div>
            <h1 className="report-title">Configuración</h1>
            <p className="report-sub">Tu cuenta y catálogos del sistema.</p>
          </div>
        </div>

        <MiCuenta />
        {esAdmin && <Catalogos />}
      </main>
    </div>
  );
}

function MiCuenta() {
  const { user } = useAuth();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setOk(false);

    if (nueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (nueva !== confirmar) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setGuardando(true);
    try {
      await cambiarMiContrasena({ actual, nueva });
      setOk(true);
      setActual('');
      setNueva('');
      setConfirmar('');
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="config-card">
      <h2 className="card-title">
        <IconUsers /> Mi cuenta
      </h2>
      <div className="cuenta-datos">
        <div>
          <span className="cuenta-label">Nombre</span>
          <span className="cuenta-valor">{user?.nombre}</span>
        </div>
        <div>
          <span className="cuenta-label">Correo</span>
          <span className="cuenta-valor">{user?.correo}</span>
        </div>
        <div>
          <span className="cuenta-label">Rol</span>
          <span className="cuenta-valor">{ROL_LABEL[user?.rol] || user?.rol}</span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="cuenta-form">
        <h3>Cambiar contraseña</h3>
        <div className="field">
          <label htmlFor="actual">Contraseña actual</label>
          <input
            id="actual"
            type="password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="nueva">Nueva contraseña</label>
            <input
              id="nueva"
              type="password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label htmlFor="confirmar">Confirmar nueva</label>
            <input
              id="confirmar"
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
        {ok && (
          <p className="ok-note">
            <IconCheckCircle /> Contraseña actualizada correctamente.
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </form>
    </section>
  );
}

function Catalogos() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [nuevoPrograma, setNuevoPrograma] = useState('');
  const [errorAccion, setErrorAccion] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarCatalogos();
      setItems(data);
      setErrorCarga(null);
    } catch (err) {
      setErrorCarga(err.message || 'No se pudieron cargar los catálogos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function onAgregar(tipo, valor, limpiar) {
    const limpio = valor.trim();
    if (!limpio) return;
    setGuardando(true);
    setErrorAccion(null);
    try {
      const creado = await crearCatalogo({ tipo, valor: limpio });
      setItems((prev) => [...prev, creado].sort((a, b) => a.valor.localeCompare(b.valor)));
      limpiar('');
    } catch (err) {
      setErrorAccion(err.message || 'No se pudo agregar el valor.');
    } finally {
      setGuardando(false);
    }
  }

  async function onToggle(item) {
    setGuardando(true);
    setErrorAccion(null);
    try {
      const actualizado = await actualizarCatalogo(item.id, { activo: !item.activo });
      setItems((prev) => prev.map((x) => (x.id === item.id ? actualizado : x)));
    } catch (err) {
      setErrorAccion(err.message || 'No se pudo guardar el cambio.');
    } finally {
      setGuardando(false);
    }
  }

  async function onEliminar(item) {
    if (!window.confirm(`¿Eliminar "${item.valor}" del catálogo? Los casos existentes no se afectan.`)) return;
    setGuardando(true);
    setErrorAccion(null);
    try {
      await eliminarCatalogo(item.id);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) {
      setErrorAccion(err.message || 'No se pudo eliminar el valor.');
    } finally {
      setGuardando(false);
    }
  }

  function valoresDe(tipo) {
    return items.filter((x) => x.tipo === tipo);
  }

  return (
    <section className="config-card">
      <h2 className="card-title">
        <IconCheckCircle /> Catálogos del formulario
      </h2>
      <p className="empty-hint">Solo la tesorera. El período académico no se administra: se calcula por fecha.</p>

      {errorAccion && <div className="form-error" style={{ marginBottom: 16 }}>{errorAccion}</div>}
      {cargando && <div className="empty-row">Cargando catálogos…</div>}
      {errorCarga && <div className="empty-row" style={{ color: 'var(--rechazado)' }}>{errorCarga}</div>}

      {!cargando && !errorCarga && (
        <>
          <BloqueCatalogo
            tipo="programa"
            titulo="Programas académicos"
            hint="Opciones del campo Programa académico en el formulario. Lo oculto no sale; eliminar no afecta casos existentes."
            items={valoresDe('programa')}
            nuevo={nuevoPrograma}
            setNuevo={setNuevoPrograma}
            guardando={guardando}
            onAgregar={onAgregar}
            onToggle={onToggle}
            onEliminar={onEliminar}
          />
        </>
      )}
    </section>
  );
}

function BloqueCatalogo({ tipo, titulo, hint, items, nuevo, setNuevo, guardando, onAgregar, onToggle, onEliminar }) {
  return (
    <div className="catalogo-bloque">
      <h3>{titulo}</h3>
      <p className="empty-hint">{hint}</p>
      <div className="catalogo-add">
        <input
          type="text"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="Nuevo valor…"
          disabled={guardando}
        />
        <button
          type="button"
          className="btn-primary catalogo-btn"
          disabled={guardando || !nuevo.trim()}
          onClick={() => onAgregar(tipo, nuevo, setNuevo)}
        >
          Agregar
        </button>
      </div>
      {items.length === 0 && <div className="empty-row">Sin valores todavía.</div>}
      {items.map((item) => (
        <div className="catalogo-row" key={item.id}>
          <span className={`tag-name${item.activo ? '' : ' inactivo'}`}>
            {item.valor}
            {item.nivel && (
              <span className="nivel-tag">{item.nivel === 'pregrado' ? 'Pregrado' : 'Posgrado'}</span>
            )}
          </span>
          <button
            type="button"
            className={`toggle-btn${item.activo ? '' : ' off'}`}
            disabled={guardando}
            onClick={() => onToggle(item)}
            title={item.activo ? 'Ocultar del formulario' : 'Mostrar en el formulario'}
          >
            {item.activo ? 'Visible' : 'Oculto'}
          </button>
          <button type="button" className="catalogo-del" disabled={guardando} onClick={() => onEliminar(item)}>
            Eliminar
          </button>
        </div>
      ))}
    </div>
  );
}
