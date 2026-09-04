// Enums del dominio. Deben quedar sincronizados con los enums del backend (FastAPI/Pydantic).
// Si se agrega un estado o tipo nuevo en el backend, actualizar aquí primero: toda la UI lee de este archivo.

export const ESTADOS = {
  RECIBIDO: 'recibido',
  EN_REVISION: 'en_revision',
  FALTA_DOCUMENTACION: 'falta_documentacion',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado',
};

// Orden en el que se muestran en filtros, selects de cambio de estado, etc.
export const ESTADOS_ORDEN = [
  ESTADOS.RECIBIDO,
  ESTADOS.EN_REVISION,
  ESTADOS.FALTA_DOCUMENTACION,
  ESTADOS.APROBADO,
  ESTADOS.RECHAZADO,
];

export const ESTADO_LABEL = {
  [ESTADOS.RECIBIDO]: 'Recibido',
  [ESTADOS.EN_REVISION]: 'En revisión',
  [ESTADOS.FALTA_DOCUMENTACION]: 'Falta documentación',
  [ESTADOS.APROBADO]: 'Aprobado',
  [ESTADOS.RECHAZADO]: 'Rechazado',
};

// Clase CSS de badge por estado (ver src/styles/global.css)
export const ESTADO_BADGE_CLASS = {
  [ESTADOS.RECIBIDO]: 'badge-recibido',
  [ESTADOS.EN_REVISION]: 'badge-revision',
  [ESTADOS.FALTA_DOCUMENTACION]: 'badge-falta',
  [ESTADOS.APROBADO]: 'badge-aprobado',
  [ESTADOS.RECHAZADO]: 'badge-rechazado',
};

export const ESTADOS_FINALES = [ESTADOS.APROBADO, ESTADOS.RECHAZADO];

// Tipo de solicitud: extensible. Hoy solo "reserva_matricula", el mockup ya contempla "devolucion".
export const TIPOS_SOLICITUD = {
  RESERVA_MATRICULA: 'reserva_matricula',
  DEVOLUCION: 'devolucion',
};

export const TIPO_SOLICITUD_LABEL = {
  [TIPOS_SOLICITUD.RESERVA_MATRICULA]: 'Reserva de matrícula',
  [TIPOS_SOLICITUD.DEVOLUCION]: 'Devolución',
};

export const TIPO_SOLICITUD_TAG_CLASS = {
  [TIPOS_SOLICITUD.RESERVA_MATRICULA]: 'reserva',
  [TIPOS_SOLICITUD.DEVOLUCION]: 'devolucion',
};

export const TIPO_SOLICITUD_TAG_LABEL = {
  [TIPOS_SOLICITUD.RESERVA_MATRICULA]: 'Reserva',
  [TIPOS_SOLICITUD.DEVOLUCION]: 'Devolución',
};

// Relaciones válidas para el campo "parentesco" cuando un tercero diligencia el formulario.
export const PARENTESCOS = [
  'Padre / Madre',
  'Cónyuge o compañero(a) permanente',
  'Hermano(a)',
  'Apoderado legal',
  'Otro familiar o allegado',
];
