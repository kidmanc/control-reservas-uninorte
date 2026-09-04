# Casos Especiales — Tesorería (frontend)

Frontend real (React + Vite) para la gestión de casos de reserva de matrícula y devolución
del área de Tesorería. Construido directamente sobre el mockup aprobado
(`mockup_casos_especiales.html`): mismos tokens de color, tipografía y componentes.

## Arrancar en GitHub Codespaces / local

```bash
npm install
npm run dev
```

Abre el puerto que indique Vite (Codespaces lo reenvía automáticamente). Rutas:

- `/` — formulario público (estudiante o tercero en su representación)
- `/panel` — lista de casos del área de Tesorería, con filtros por estado/tipo/búsqueda
- `/panel/casos/:id` — detalle de un caso (trazabilidad, comentarios, archivos, cambio de estado)

## Estado actual

**Con esto ya se puede navegar y probar el flujo completo end-to-end usando datos en memoria**
(`src/features/casos/mock/mockCasos.js` + `src/features/casos/api/casosApi.js`). No hay
backend todavía — ver la sección "Conectar con el backend" abajo.

Lo que sí funciona ahora mismo, contra los datos mock:
- Crear un caso desde el formulario (como estudiante o como tercero) → aparece en `/panel`.
- Filtrar la lista por estado (tarjetas), tipo de solicitud, "diligenciado por tercero" y búsqueda de texto.
- Abrir un caso, cambiar su estado (queda registrado en la trazabilidad) y agregar comentarios
  (internos o visibles para el estudiante).

Lo que falta (fuera del alcance de "solo frontend"):
- Autenticación real (login institucional) — el usuario "Carolina Mejía" está harcodeado en
  `src/components/layout/PanelSidebar.jsx`.
- Subida real de archivos (hoy solo se guarda el nombre/tamaño en memoria, no el archivo).
- Notificaciones por correo.
- Las rutas "Tipos de solicitud", "Reportes" y "Configuración" del sidebar (placeholders, ver TODO en `App.jsx`).
- Creación manual de caso por la asistente (botón "Nuevo caso manual" en `/panel`, sin acción aún).

## Estructura de carpetas

```
src/
  styles/            tokens.css (paleta/tipografía tomada del mockup) + global.css
  components/
    layout/           PanelSidebar (nav del panel interno)
    ui/                EstadoBadge, TipoTag, icons.jsx (SVGs compartidos)
  features/
    casos/
      constants.js     enums de estado y tipo de solicitud — única fuente de verdad
      api/casosApi.js  capa de datos: HOY mocks, MAÑANA fetch a FastAPI (mismo contrato)
      mock/            datos de ejemplo, mismo shape que el modelo de datos del backend
      pages/           FormularioCasoPage, ListaCasosPage, DetalleCasoPage
      components/      subcomponentes de la página de detalle (StatusChanger, FilesSidebar, etc.)
```

La organización sigue la misma idea de "capas por modelo" que la arquitectura del backend
(cada feature agrupa sus rutas/páginas, su capa de datos y sus componentes, en vez de una
carpeta global `pages/` + una global `api/`).

## Conectar con el backend (FastAPI)

Todo el acceso a datos pasa por `src/features/casos/api/casosApi.js`. Cada función de ese
archivo ya tiene documentado el endpoint REST al que corresponde. Para conectar el backend
real, solo hay que reemplazar el cuerpo de esas funciones por `fetch('/api/...')` — ningún
componente de página necesita cambiar, porque todos consumen `casosApi`, nunca los mocks
directamente.

Cuando eso pase, probablemente convenga:
1. Configurar `VITE_API_URL` en `.env` y un proxy de Vite hacia el backend en dev.
2. Manejar estados de error de red en las páginas (hoy asumen que la promesa siempre resuelve).
3. Reemplazar la subida de archivos simulada por `FormData` real hacia el endpoint de archivos.
