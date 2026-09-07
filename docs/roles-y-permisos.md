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
| **Tesorero (admin)** | Todos los casos | Gestionar usuarios; corregir estados finales; operar cualquier paso válido del recorrido | No opera el flujo día a día (solo override y correcciones) |
| **Asistente de Tesorería** | Todos los casos | Cambiar estados **no finales**; editar nivel académico; mover el recorrido (enviar a Centro Médico o a Revisión) | Fijar aprobado/rechazado; fijar porcentajes o destino; sacar casos de `falta_documentacion` o de estados finales |
| **Revisor de detalle** | Solo sus casos en mano + su historial (lectura) | Comentar sus casos; enviar a Aprobación final; devolver a Tesorería **con correcciones** (motivo obligatorio) | Cambiar estados; registrar decisiones; ver casos ajenos |
| **Centro Médico** | Solo sus casos en mano + su historial (lectura) | Comentar sus casos; devolver a Tesorería con veredicto: **documentos válidos** o **documentos inválidos** (motivo obligatorio) | Cambiar estados; registrar decisiones; enviar a otro paso |
| **Aprobador final** | Solo sus casos en mano + su historial (lectura) | Fijar **aprobado/rechazado**; fijar porcentaje y destino; devolver **a quien se lo envió** con correcciones (motivo obligatorio) | Cambiar estados no finales; ver casos ajenos |
| **Estudiante / tercero** (canal público, sin login) | Solo su caso con el enlace | Comentar; adjuntar documentos cuando se le piden | Todo lo demás |

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

- El **historial** de cada operador registra los casos que pasaron por sus manos (lectura). Los filtros de estado, tipo y búsqueda aplican a bandeja e historial a la vez.
- Los casos movidos antes de existir el historial se registran automáticamente al iniciar el backend (backfill idempotente).
- Cuentas de ejemplo para desarrollo (contraseña `password123`): se crean con `python seed.py` y la tesorera las reemplaza por las reales en Gestión de usuarios.
