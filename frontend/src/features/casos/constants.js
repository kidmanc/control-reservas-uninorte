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
// (`en_revision` se retiró del flujo; se conserva el enum para la trazabilidad vieja).
export const ESTADOS_ORDEN = [
  ESTADOS.RECIBIDO,
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

// Nivel académico del estudiante.
export const NIVELES_ACADEMICOS = {
  PREGRADO: 'pregrado',
  POSGRADO: 'posgrado',
};

export const NIVEL_ACADEMICO_LABEL = {
  [NIVELES_ACADEMICOS.PREGRADO]: 'Pregrado',
  [NIVELES_ACADEMICOS.POSGRADO]: 'Posgrado',
};

// Porcentajes de decisión que Tesorería puede aplicar, según el tipo de solicitud.
// "0" representa la decisión de no aplicar (rechazo del beneficio).
export const PORCENTAJES_POR_TIPO = {
  [TIPOS_SOLICITUD.RESERVA_MATRICULA]: [
    { valor: 85, etiqueta: '85%' },
    { valor: 75, etiqueta: '75%' },
    { valor: 100, etiqueta: '100%' },
    { valor: 0, etiqueta: '0% (rechazado)' },
  ],
  [TIPOS_SOLICITUD.DEVOLUCION]: [
    { valor: 100, etiqueta: '100%' },
    { valor: 50, etiqueta: '50%' },
    { valor: 40, etiqueta: '40%' },
    { valor: 0, etiqueta: '0% (rechazado)' },
  ],
};

// Destinos posibles de una devolución una vez aprobada.
export const DESTINOS_DEVOLUCION = {
  ESTUDIANTE: 'estudiante',
  ICETEX: 'icetex',
};

export const DESTINO_DEVOLUCION_LABEL = {
  [DESTINOS_DEVOLUCION.ESTUDIANTE]: 'Al estudiante',
  [DESTINOS_DEVOLUCION.ICETEX]: 'Al ICETEX',
};
