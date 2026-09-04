import { useState } from 'react';
import { Link } from 'react-router-dom';
import { crearCaso } from '../api/casosApi';
import { TIPOS_SOLICITUD, TIPO_SOLICITUD_LABEL, PARENTESCOS } from '../constants';
import { IconClock, IconInfo, IconUsers, IconUpload, IconCheckCircle, IconFile, IconArrowRight } from '../../../components/ui/icons';
import './FormularioCasoPage.css';

const PROGRAMAS = ['Ingeniería de Sistemas', 'Administración de Empresas', 'Derecho', 'Ingeniería Industrial', 'Psicología', 'Ingeniería Electrónica'];
const PERIODOS = ['2026-10', '2026-20'];

const ESTADO_INICIAL = {
  esTercero: false,
  tercero: { nombre_completo: '', parentesco: PARENTESCOS[0], documento_identidad: '', telefono_contacto: '', correo_contacto: '' },
  nombre_completo: '',
  codigo_estudiantil: '',
  correo_institucional: '',
  telefono_contacto: '',
  tipo_solicitud: '',
  programa_academico: PROGRAMAS[0],
  periodo_academico: PERIODOS[0],
  motivo: '',
  descripcion_adjuntos: '',
  archivos: [],
  archivo_representacion: null,
};

export default function FormularioCasoPage() {
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [casoCreado, setCasoCreado] = useState(null);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function setTercero(campo, valor) {
    setForm((f) => ({ ...f, tercero: { ...f.tercero, [campo]: valor } }));
  }

  function onArchivosSeleccionados(e) {
    const nuevos = Array.from(e.target.files ?? []);
    setForm((f) => ({ ...f, archivos: [...f.archivos, ...nuevos] }));
    e.target.value = '';
  }

  function quitarArchivo(index) {
    setForm((f) => ({ ...f, archivos: f.archivos.filter((_, i) => i !== index) }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!form.nombre_completo || !form.codigo_estudiantil || !form.correo_institucional || !form.tipo_solicitud || !form.motivo) {
      setError('Completa los campos obligatorios antes de enviar la solicitud.');
      return;
    }
    if (form.esTercero && !form.archivo_representacion) {
      setError('Adjunta el soporte de representación: es obligatorio cuando un tercero diligencia la solicitud.');
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        nombre_completo: form.nombre_completo,
        codigo_estudiantil: form.codigo_estudiantil,
        correo_institucional: form.correo_institucional,
        telefono_contacto: form.telefono_contacto,
        programa_academico: form.programa_academico,
        tipo_solicitud: form.tipo_solicitud,
        periodo_academico: form.periodo_academico,
        motivo: form.motivo,
        descripcion_adjuntos: form.descripcion_adjuntos,
        archivos: form.esTercero ? [...form.archivos, form.archivo_representacion] : form.archivos,
        tercero: form.esTercero ? form.tercero : null,
      };
      const creado = await crearCaso(payload);
      setCasoCreado(creado);
    } finally {
      setEnviando(false);
    }
  }

  if (casoCreado) {
    return (
      <div className="student-page">
        <StudentHeader />
        <div className="success-screen">
          <div className="icon-wrap">
            <IconCheckCircle stroke="var(--verde)" />
          </div>
          <h1>Solicitud enviada</h1>
          <p>
            Registramos tu caso con el número <span className="caso-id">{casoCreado.id}</span>. Te
            notificaremos por correo institucional cuando cambie el estado o recibas un comentario del área de
            Tesorería. Tiempo estimado de respuesta: 3 a 5 días hábiles.
          </p>
          <Link className="btn-primary" to={`/seguimiento/${casoCreado.id}`}>
            Ver seguimiento de mi solicitud
          </Link>
          <p style={{ fontSize: 12, color: '#948f85', marginTop: 16 }}>
            (En producción este acceso llega por correo institucional, con un enlace único — este botón es solo
            para que puedas probarlo ahora)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-page">
      <StudentHeader />

      <form className="student-container" onSubmit={onSubmit}>
        <div className="intro-block">
          <span className="eyebrow-pill">
            <IconClock />
            Tiempo estimado de respuesta: 3 a 5 días hábiles
          </span>
          <h1>Solicitud de caso especial</h1>
          <p>
            Usa este formulario para solicitudes de <strong>reserva de matrícula por causa especial</strong> o de{' '}
            <strong>devolución</strong> que requieran soporte documental. Un miembro de Tesorería revisará tu caso y
            podrás dar seguimiento al estado en cualquier momento desde el enlace que recibirás por correo.
          </p>

          <div className="scope-note">
            <div className="icon-wrap">
              <IconInfo />
            </div>
            <div className="txt">
              <strong>¿Es este el formulario correcto?</strong>
              <p>
                Este canal es exclusivo para casos que requieren evaluación y soporte documental (incapacidades
                médicas, calamidad doméstica, situaciones excepcionales, etc.). Si tu trámite es una reserva o
                devolución estándar sin justificación especial, realízalo por el portal habitual de matrículas.
              </p>
            </div>
          </div>
        </div>

        {/* Sección 1: quién completa el formulario */}
        <div className="form-section">
          <div className="section-heading">
            <div className="section-number">1</div>
            <h2>¿Quién completa este formulario?</h2>
          </div>

          <div className="filler-toggle">
            <div className={`filler-option${!form.esTercero ? ' selected' : ''}`} onClick={() => set('esTercero', false)}>
              <span className="radio" />
              <div className="txt">
                <strong>El estudiante</strong>
                <span>Estoy diligenciando mi propia solicitud.</span>
              </div>
            </div>
            <div className={`filler-option${form.esTercero ? ' selected' : ''}`} onClick={() => set('esTercero', true)}>
              <span className="radio" />
              <div className="txt">
                <strong>Un tercero, en representación del estudiante</strong>
                <span>El estudiante está incapacitado o impedido para completar el formulario.</span>
              </div>
            </div>
          </div>

          {form.esTercero && (
            <div className="tercero-panel">
              <div className="tp-head">
                <div className="icon-wrap">
                  <IconUsers />
                </div>
                <div>
                  <strong>Datos de quien diligencia la solicitud</strong>
                  <div className="tp-sub">Esta información queda registrada junto con el caso para efectos de trazabilidad.</div>
                </div>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label>Nombre completo del tercero</label>
                  <input
                    type="text"
                    placeholder="Ej. Carlos Rojas Medina"
                    value={form.tercero.nombre_completo}
                    onChange={(e) => setTercero('nombre_completo', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Parentesco o relación con el estudiante</label>
                  <select value={form.tercero.parentesco} onChange={(e) => setTercero('parentesco', e.target.value)}>
                    {PARENTESCOS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Documento de identidad</label>
                  <input
                    type="text"
                    placeholder="Ej. C.C. 72.345.678"
                    value={form.tercero.documento_identidad}
                    onChange={(e) => setTercero('documento_identidad', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Teléfono de contacto</label>
                  <input
                    type="tel"
                    placeholder="Ej. 300 987 6543"
                    value={form.tercero.telefono_contacto}
                    onChange={(e) => setTercero('telefono_contacto', e.target.value)}
                  />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Correo de contacto</label>
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={form.tercero.correo_contacto}
                    onChange={(e) => setTercero('correo_contacto', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sección 2: datos del estudiante */}
        <div className="form-section">
          <div className="section-heading">
            <div className="section-number">2</div>
            <h2>Datos del estudiante</h2>
            <span className="heading-hint">{form.esTercero ? '— completa con los datos del estudiante representado' : ''}</span>
          </div>
          <div className="field-grid">
            <div className="field">
              <label>Nombre completo</label>
              <input
                type="text"
                placeholder="Ej. María Fernanda Rojas Cárdenas"
                value={form.nombre_completo}
                onChange={(e) => set('nombre_completo', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Código estudiantil</label>
              <input
                type="text"
                placeholder="Ej. 200145632"
                value={form.codigo_estudiantil}
                onChange={(e) => set('codigo_estudiantil', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Correo institucional</label>
              <input
                type="email"
                placeholder="nombre@uninorte.edu.co"
                value={form.correo_institucional}
                onChange={(e) => set('correo_institucional', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Teléfono de contacto</label>
              <input
                type="tel"
                placeholder="Ej. 300 123 4567"
                value={form.telefono_contacto}
                onChange={(e) => set('telefono_contacto', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Sección 3: datos de la solicitud */}
        <div className="form-section">
          <div className="section-heading">
            <div className="section-number">3</div>
            <h2>Datos de la solicitud</h2>
          </div>
          <div className="field-grid">
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Tipo de solicitud</label>
              <select value={form.tipo_solicitud} onChange={(e) => set('tipo_solicitud', e.target.value)}>
                <option value="">Selecciona el tipo de caso especial</option>
                {Object.values(TIPOS_SOLICITUD).map((t) => (
                  <option key={t} value={t}>
                    {TIPO_SOLICITUD_LABEL[t]}
                  </option>
                ))}
              </select>
              <span className="hint">
                Elige "Reserva" si necesitas aplazar tu ingreso por una causa excepcional, o "Devolución" si
                solicitas el reembolso de un valor pagado.
              </span>
            </div>
            <div className="field">
              <label>Programa académico</label>
              <select value={form.programa_academico} onChange={(e) => set('programa_academico', e.target.value)}>
                {PROGRAMAS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Período académico</label>
              <select value={form.periodo_academico} onChange={(e) => set('periodo_academico', e.target.value)}>
                {PERIODOS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field" style={{ marginTop: 20 }}>
            <label>Motivo de la solicitud</label>
            <span className="hint">Cuéntanos con detalle qué situación lleva a esta solicitud. Esta información es confidencial.</span>
            <textarea
              placeholder="Ejemplo: Debido a un accidente ocurrido el 15 de agosto, el estudiante se encuentra en incapacidad médica y no podrá continuar con sus actividades académicas durante el periodo..."
              value={form.motivo}
              onChange={(e) => set('motivo', e.target.value)}
            />
          </div>
        </div>

        {/* Sección 4: adjuntos */}
        <div className="form-section">
          <div className="section-heading">
            <div className="section-number">4</div>
            <h2>Documentos de soporte</h2>
          </div>
          <div className="field">
            <label>Descripción breve de lo que adjuntas</label>
            <span className="hint">Ej. "Certificado médico y epicrisis de la clínica"</span>
            <input
              type="text"
              placeholder="Describe brevemente los documentos que estás subiendo"
              value={form.descripcion_adjuntos}
              onChange={(e) => set('descripcion_adjuntos', e.target.value)}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="upload-zone" style={{ display: 'block' }}>
              <div className="upload-icon">
                <IconUpload />
              </div>
              <div className="main-text">Arrastra tus archivos aquí o haz clic para seleccionar</div>
              <div className="sub-text">PDF, JPG o PNG · máximo 10 MB por archivo</div>
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={onArchivosSeleccionados} />
            </label>

            {form.archivos.map((archivo, i) => (
              <div className="file-chip" key={`${archivo.name}-${i}`}>
                <div className="file-icon">
                  <IconFile />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="file-name">{archivo.name}</div>
                </div>
                <div className="file-size">{(archivo.size / (1024 * 1024)).toFixed(1)} MB</div>
                <button type="button" className="file-remove" onClick={() => quitarArchivo(i)} aria-label="Quitar archivo">
                  ×
                </button>
              </div>
            ))}
          </div>

          {form.esTercero && (
            <div style={{ marginTop: 24 }}>
              <div className="field">
                <label>
                  Soporte de representación<span className="required-tag">Obligatorio</span>
                </label>
                <span className="hint">
                  Documento que acredite la representación del estudiante: poder simple, carta de autorización
                  firmada, registro civil (padres) o documento equivalente.
                </span>
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="upload-zone required-zone" style={{ display: 'block' }}>
                  <div className="upload-icon" style={{ background: '#fbe9a8' }}>
                    <IconCheckCircle />
                  </div>
                  <div className="main-text">
                    {form.archivo_representacion ? form.archivo_representacion.name : 'Adjunta el soporte de representación'}
                  </div>
                  <div className="sub-text">PDF o imagen legible · máximo 10 MB</div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    onChange={(e) => set('archivo_representacion', e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {error && <p className="form-error" style={{ marginBottom: 16 }}>{error}</p>}

        <div className="submit-bar">
          <div className="submit-note">Al enviar, se notificará por correo con un enlace único para dar seguimiento al caso.</div>
          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar solicitud'}
            {!enviando && <IconArrowRight />}
          </button>
        </div>
      </form>
    </div>
  );
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
