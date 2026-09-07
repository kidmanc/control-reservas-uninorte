import { useCallback, useEffect, useState } from 'react';
import PanelSidebar from '../../../components/layout/PanelSidebar';
import { IconUserAdd, IconCheckCircle, IconUsers } from '../../../components/ui/icons';
import { listarUsuarios, crearUsuario, actualizarUsuario } from '../api/usuariosApi';
import { useAuth } from '../../auth/AuthContext';
import './UsuariosPage.css';

const ESTADO_INICIAL = {
  nombre: '',
  correo: '',
  contrasena: '',
  iniciales: '',
  rol: 'asistente_tesoreria',
};

const ROLES = {
  admin: 'Tesorero (admin)',
  asistente_tesoreria: 'Asistente de Tesorería',
  revisor: 'Revisor (p. ej. Centro Médico)',
};

export default function UsuariosPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [errorForm, setErrorForm] = useState(null);
  const [creando, setCreando] = useState(false);
  const [creado, setCreado] = useState(null);
  const [guardandoId, setGuardandoId] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarUsuarios();
      setUsuarios(data);
      setErrorCarga(null);
    } catch (err) {
      setErrorCarga(err.message || 'No se pudieron cargar los usuarios.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErrorForm(null);
    setCreado(null);

    if (!form.nombre.trim() || !form.correo.trim() || form.contrasena.length < 8 || !form.iniciales.trim()) {
      setErrorForm('Completa todos los campos (la contraseña debe tener al menos 8 caracteres).');
      return;
    }

    setCreando(true);
    try {
      const nuevo = await crearUsuario({
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        contrasena: form.contrasena,
        iniciales: form.iniciales.trim(),
        rol: form.rol,
      });
      setUsuarios((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setCreado(nuevo);
      setForm(ESTADO_INICIAL);
    } catch (err) {
      setErrorForm(err.message || 'No se pudo crear el usuario.');
    } finally {
      setCreando(false);
    }
  }

  async function onGuardarCambios(u, campo, valor) {
    const cambios = { [campo]: valor };
    setGuardandoId(u.id);
    setErrorAccion(null);
    try {
      const actualizado = await actualizarUsuario(u.id, cambios);
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? actualizado : x)));
    } catch (err) {
      setErrorAccion(err.message || 'No se pudo guardar el cambio.');
    } finally {
      setGuardandoId(null);
    }
  }

  return (
    <div className="panel-layout">
      <PanelSidebar />
      <main className="main-panel">
        <div className="usuarios-head">
          <div>
            <h1 className="panel-title">Gestión de usuarios</h1>
            <p className="panel-sub">Crea asistentes de Tesorería y ajusta sus permisos desde aquí.</p>
          </div>
        </div>

        {errorAccion && <div className="form-error" style={{ marginBottom: 16 }}>{errorAccion}</div>}

        <div className="usuarios-grid">
          {/* Columna: crear usuario */}
          <section className="usuarios-card">
            <h2 className="card-title">
              <IconUserAdd /> Nuevo usuario
            </h2>

            <form onSubmit={onSubmit} className="usuario-form">
              <div className="field">
                <label htmlFor="nombre">Nombre completo</label>
                <input
                  id="nombre"
                  type="text"
                  value={form.nombre}
                  onChange={(e) => set('nombre', e.target.value)}
                  placeholder="Ej. Laura Gómez"
                />
              </div>
              <div className="field">
                <label htmlFor="correo">Correo institucional</label>
                <input
                  id="correo"
                  type="email"
                  value={form.correo}
                  onChange={(e) => set('correo', e.target.value)}
                  placeholder="nombre@uninorte.edu.co"
                />
              </div>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="contrasena">Contraseña</label>
                  <input
                    id="contrasena"
                    type="password"
                    value={form.contrasena}
                    onChange={(e) => set('contrasena', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                  />
                </div>
                <div className="field">
                  <label htmlFor="iniciales">Iniciales</label>
                  <input
                    id="iniciales"
                    type="text"
                    value={form.iniciales}
                    onChange={(e) => set('iniciales', e.target.value)}
                    placeholder="Ej. LG"
                    maxLength={10}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="rol">Rol</label>
                <select id="rol" value={form.rol} onChange={(e) => set('rol', e.target.value)}>
                  <option value="asistente_tesoreria">Asistente de Tesorería</option>
                  <option value="revisor">Revisor (p. ej. Centro Médico)</option>
                  <option value="admin">Tesorero (admin)</option>
                </select>
              </div>

              {errorForm && <p className="form-error">{errorForm}</p>}
              {creado && (
                <p className="ok-note">
                  <IconCheckCircle /> Usuario {creado.nombre} ({creado.correo}) creado correctamente.
                </p>
              )}

              <button type="submit" className="btn-primary" disabled={creando}>
                {creando ? 'Creando…' : 'Crear usuario'}
              </button>
            </form>
          </section>

          {/* Columna: lista de usuarios */}
          <section className="usuarios-card">
            <h2 className="card-title">
              <IconUsers /> Usuarios ({usuarios.length})
            </h2>

            <p className="empty-hint">Los usuarios con acceso pueden iniciar sesión en el panel de Tesorería.</p>

            {cargando && <div className="empty-row">Cargando usuarios…</div>}
            {errorCarga && <div className="empty-row" style={{ color: 'var(--rechazado)' }}>{errorCarga}</div>}

            {!cargando && !errorCarga && (
              <div className="usuarios-table">
                <div className="usuario-row header-row">
                  <span>Nombre</span>
                  <span>Correo</span>
                  <span>Rol</span>
                  <span>Estado</span>
                </div>

                {usuarios.length === 0 && <div className="empty-row">Todavía no hay usuarios creados.</div>}

                {usuarios.map((u) => {
                  const esSelf = u.id === user?.id;
                  return (
                  <div className="usuario-row" key={u.id}>
                    <div className="usuario-nombre">
                      <div className="avatar-mini">{u.iniciales}</div>
                      <div>
                        <div className="tag-name">
                          {u.nombre}
                          {esSelf && <span className="tag-self" title="No puedes modificar tu propio rol ni desactivarte">Eres tú</span>}
                        </div>
                        <div className="tag-sub">#{u.id}</div>
                      </div>
                    </div>
                    <span className="tag-meta">{u.correo}</span>
                    <select
                      value={u.rol}
                      disabled={esSelf || guardandoId === u.id}
                      onChange={(e) => onGuardarCambios(u, 'rol', e.target.value)}
                      className="rol-select"
                      title={esSelf ? 'No puedes modificar tu propio rol' : undefined}
                    >
                      {Object.entries(ROLES).map(([valor, etiqueta]) => (
                        <option key={valor} value={valor}>{etiqueta}</option>
                      ))}
                    </select>
                    <button
                      className={`toggle-btn${u.activo ? '' : ' off'}`}
                      disabled={esSelf || guardandoId === u.id}
                      onClick={() => onGuardarCambios(u, 'activo', !u.activo)}
                      title={esSelf ? 'No puedes desactivar tu propia cuenta' : undefined}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}