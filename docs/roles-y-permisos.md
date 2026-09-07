# Roles, permisos y recorrido del caso

Sistema de Tesorería Uninorte — casos especiales (reserva de matrícula y devolución).

## Recorrido del caso (tenedor único)

El caso siempre está **en manos de una sola persona**. Los pasos válidos son:

1. **Tesorería (asistente)** recibe, revisa y liquida → envía al **Centro Médico** (si requiere validación médica) o a **Revisión de detalle**.
2. **Centro Médico** valida los documentos → devuelve a Tesorería con su veredicto.
3. **Revisión de detalle** revisa → envía a **Aprobación final** o devuelve a Tesorería con correcciones.
4. **Aprobación final** aprueba/rechaza (fija porcentaje y destino) o devuelve a Revisión de detalle con correcciones. Al aprobarse o rechazarse, el caso **vuelve a Tesorería**: sale de la bandeja del aprobador y queda en los historiales.

## Qué puede hacer cada rol

| Rol | Ve | Puede hacer | NO puede |
|---|---|---|---|
| **Tesorero (admin)** | Todos los casos | Gestionar usuarios; corregir estados finales; operar cualquier paso válido del recorrido (override) | No opera el flujo día a día |
| **Asistente de Tesorería** | Todos los casos | En casos en Tesorería: cambiar estados **no finales**; editar nivel académico; enviar a Centro Médico o a Revisión | Tocar casos en manos de otro paso; fijar aprobado/rechazado; fijar porcentajes o destino; sacar casos de `falta_documentacion` o de estados finales |
| **Revisor de detalle** | Sus casos en mano + los que ya revisó (una sola lista) | Comentar sus casos; enviar a Aprobación final; devolver a Tesorería **con correcciones** (motivo obligatorio) | Cambiar estados; registrar decisiones; ver casos ajenos |
| **Centro Médico** | Sus casos en mano + los que ya revisó (una sola lista) | Comentar sus casos; devolver a Tesorería con veredicto: **documentos válidos** o **documentos inválidos** (motivo obligatorio) | Cambiar estados; registrar decisiones; enviar a otro paso |
| **Aprobador final** | Sus casos en mano + los que ya revisó (una sola lista) | Fijar **aprobado/rechazado** (exige porcentaje y, si es devolución, destino); fijar porcentaje y destino; devolver **a quien se lo envió** con correcciones (motivo obligatorio) | Cambiar estados no finales; aprobar sin porcentaje; ver casos ajenos |
| **Estudiante / tercero** (canal público, sin login) | Solo su caso con el enlace | Comentar; adjuntar documentos cuando se le piden; ver su trazabilidad con hora de Colombia | Todo lo demás |

## Devoluciones

- Toda devolución exige **motivo escrito** (queda como comentario interno + historial).
- El Centro Médico y Revisión devuelven siempre a **Tesorería** (destino único).
- El Aprobador solo puede devolver **a quien se lo envió** (aunque haya varios revisores).
- Tesorería conserva override para casos borde (ej. remitente inactivo).

## Estados y transición automática

- Estados: `recibido`, `en_revision`, `falta_documentacion`, `aprobado`, `rechazado`.
- `en_revision` **no es opción manual**: el proceso interno mueve `recibido → en_revision` a las 24 horas.
- Si el caso está en `falta_documentacion`, al adjuntar el estudiante sus documentos vuelve solo a `en_revision`.
- Nadie (salvo el tesorero) toca casos en `falta_documentacion` ni en estados finales.

## Notas

- Cada operador ve **una sola lista**: sus casos en mano primero y luego los que ya revisó (la columna Asignado muestra quién tiene cada caso). Los filtros aplican a todo.
- Los casos movidos antes de existir el historial se registran automáticamente al iniciar el backend (backfill idempotente).
- Todas las fechas se muestran en **hora de Colombia** (el backend emite UTC y el frontend convierte).
- Cuentas de ejemplo para desarrollo (contraseña `password123`): se crean con `python seed.py` y la tesorera las reemplaza por las reales en Gestión de usuarios.
