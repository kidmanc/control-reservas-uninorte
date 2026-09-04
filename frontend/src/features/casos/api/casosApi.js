import { mockCasos } from '../mock/mockCasos';
import { ESTADOS } from '../constants';

/**
 * CAPA DE DATOS — hoy: mocks en memoria. Mañana: fetch al backend FastAPI.
 *
 * Cada función de aquí abajo corresponde 1:1 a un endpoint que definiremos en el
 * backend (capa 2 "rutas" en la arquitectura de capas: [modelo].route.py /
 * [modelo].controller.py / [modelo].action.py / [modelo].model.py, adaptada a
 * FastAPI+SQLAlchemy). Cuando el backend esté listo, solo hay que reemplazar el
 * cuerpo de estas funciones por `fetch(...)` — los componentes no cambian.
 *
 * Endpoints previstos:
 *   GET    /api/casos                    -> listCasos(filtros)
 *   GET    /api/casos/{id}                -> getCaso(id)
 *   POST   /api/casos                     -> crearCaso(payload)
 *   PATCH  /api/casos/{id}/estado          -> cambiarEstado(id, nuevoEstado)
 *   POST   /api/casos/{id}/comentarios     -> agregarComentario(id, comentario)
 *   POST   /api/casos/{id}/archivos        -> subirArchivo(id, archivo)
 */

const LATENCIA_SIMULADA_MS = 250;

// Copia mutable en memoria para que la UI se sienta real durante el desarrollo
// del frontend (crear caso, cambiar estado, comentar quedan "guardados" en la sesión).
let casosEnMemoria = mockCasos.map((c) => ({ ...c }));

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCIA_SIMULADA_MS));
}

function siguienteId() {
  const numeros = casosEnMemoria.map((c) => Number(c.id.split('-').pop()));
  const max = numeros.length ? Math.max(...numeros) : 0;
  return `RM-2026-${String(max + 1).padStart(4, '0')}`;
}

/**
 * @param {{ estado?: string, tipo_solicitud?: string, texto?: string }} filtros
 */
export async function listCasos(filtros = {}) {
  let resultado = casosEnMemoria;

  if (filtros.estado) {
    resultado = resultado.filter((c) => c.estado === filtros.estado);
  }
  if (filtros.tipo_solicitud) {
    resultado = resultado.filter((c) => c.tipo_solicitud === filtros.tipo_solicitud);
  }
  if (filtros.soloTerceros) {
    resultado = resultado.filter((c) => !!c.tercero);
  }
  if (filtros.texto) {
    const q = filtros.texto.toLowerCase();
    resultado = resultado.filter(
      (c) =>
        c.nombre_completo.toLowerCase().includes(q) ||
        c.codigo_estudiantil.toLowerCase().includes(q) ||
        c.correo_institucional.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }

  // más recientes primero
  resultado = [...resultado].sort(
    (a, b) => new Date(b.fecha_ultima_actualizacion) - new Date(a.fecha_ultima_actualizacion)
  );

  return delay(resultado);
}

export async function getCaso(id) {
  const caso = casosEnMemoria.find((c) => c.id === id);
  return delay(caso ?? null);
}

/**
 * @param {object} payload datos del formulario (ver features/casos/pages/FormularioCasoPage.jsx)
 */
export async function crearCaso(payload) {
  const nuevo = {
    id: siguienteId(),
    ...payload,
    estado: ESTADOS.RECIBIDO,
    asistente_asignada: null,
    fecha_creacion: new Date().toISOString(),
    fecha_ultima_actualizacion: new Date().toISOString(),
    comentarios: [],
    archivos: (payload.archivos ?? []).map((a, i) => ({
      id: `f-new-${i}`,
      nombre_archivo: a.name,
      subido_por: payload.tercero ? 'tercero' : 'estudiante',
      descripcion: payload.descripcion_adjuntos ?? null,
      fecha: new Date().toISOString(),
    })),
    historial_estados: [
      {
        id: 'h-new-1',
        estado_anterior: null,
        estado_nuevo: ESTADOS.RECIBIDO,
        cambiado_por: 'Sistema',
        descripcion: payload.tercero
          ? `${payload.tercero.nombre_completo} envió la solicitud en representación del estudiante`
          : 'El estudiante envió la solicitud',
        fecha: new Date().toISOString(),
      },
    ],
  };
  casosEnMemoria = [nuevo, ...casosEnMemoria];
  return delay(nuevo);
}

export async function cambiarEstado(id, nuevoEstado, { cambiadoPor = 'Carolina Mejía', descripcion } = {}) {
  casosEnMemoria = casosEnMemoria.map((c) => {
    if (c.id !== id) return c;
    const entradaHistorial = {
      id: `h-${Date.now()}`,
      estado_anterior: c.estado,
      estado_nuevo: nuevoEstado,
      cambiado_por: cambiadoPor,
      descripcion: descripcion ?? null,
      fecha: new Date().toISOString(),
    };
    return {
      ...c,
      estado: nuevoEstado,
      fecha_ultima_actualizacion: entradaHistorial.fecha,
      historial_estados: [...c.historial_estados, entradaHistorial],
    };
  });
  return delay(casosEnMemoria.find((c) => c.id === id));
}

/**
 * El estudiante (o el tercero) sube un archivo adicional desde la vista pública de
 * seguimiento — típicamente para responder a un caso en estado "Falta documentación".
 * Corresponde al mismo endpoint que subirArchivo en el panel interno
 * (POST /api/casos/{id}/archivos), solo cambia quién lo llama.
 */
export async function subirArchivoEstudiante(id, archivo, descripcion) {
  casosEnMemoria = casosEnMemoria.map((c) => {
    if (c.id !== id) return c;
    const nuevoArchivo = {
      id: `f-${Date.now()}`,
      nombre_archivo: archivo.name,
      subido_por: 'estudiante',
      descripcion: descripcion || null,
      fecha: new Date().toISOString(),
    };
    return {
      ...c,
      archivos: [...c.archivos, nuevoArchivo],
      fecha_ultima_actualizacion: nuevoArchivo.fecha,
    };
  });
  return delay(casosEnMemoria.find((c) => c.id === id));
}

export async function agregarComentario(id, { texto, visible_para_estudiante, autor = 'Carolina Mejía' }) {
  casosEnMemoria = casosEnMemoria.map((c) => {
    if (c.id !== id) return c;
    const comentario = {
      id: `c-${Date.now()}`,
      autor,
      texto,
      visible_para_estudiante,
      fecha: new Date().toISOString(),
    };
    return {
      ...c,
      comentarios: [...c.comentarios, comentario],
      fecha_ultima_actualizacion: comentario.fecha,
    };
  });
  return delay(casosEnMemoria.find((c) => c.id === id));
}
