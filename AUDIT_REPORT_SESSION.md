# 🕵️ Reporte Especial de Auditoría - Sesión 22 Mar 2026

Este documento detalla todos los cambios técnicos, lógica implementada y archivos modificados durante esta sesión, estructurados por bloques de desarrollo.

---

## 🎯 Bloque C: Bingo Autodetection
**Objetivo**: Resolver un error de permisos y automatización incorrecta en el servidor.

### Cambios en Backend (`createMemory.js`)
- **Eliminación de Mutación Directa**: Se quitó la lógica que marcaba el bingo automáticamente en el servidor (esto causaba errores de permisos y no permitía revisión del usuario).
- **Lógica de Sugerencias**: Ahora el backend realiza una búsqueda de solo-lectura sobre las categorías y devuelve un array `bingoSuggestions` al cliente basado en `tags` y `movieData`.

### Cambios en Frontend (`MemoryForm.jsx` & UI)
- **BingoSuggestionSheet**: Nuevo componente con estética "Chunky Clay" que muestra las sugerencias como Pills seleccionables.
- **BottomSheetModal**: Se añadió la prop `hideActions` para permitir que componentes hijos tomen control total de la zona de botones cuando el flujo sea complejo.

---

## ⏳ Bloque D: Capsule Multimedia
**Objetivo**: Habilitar subida de múltiples fotos/videos a las Cápsulas del Tiempo.

### Frontend
- **MediaUploader.jsx**: Componente nuevo para selección múltiple con previsualización en tiempo real.
- **CapsuleForm.jsx**: Integrado el uploader con una **barra de progreso ponderada** que muestra el avance secuencial de las subidas a Storage.
- **Lógica de Subida**: Los archivos se suben a `capsules/{tempId}/{fileId}` antes de llamar a la función final de creación.

### Backend (`createCapsule.js` & `openCapsule.js`)
- **Persistencia**: `createCapsule` ahora recibe el array `attachments` y lo guarda en el campo `files` del documento Firestore.
- **Seguridad Read-Once**: `openCapsule` ahora devuelve los adjuntos pero los **borra de la base de datos** inmediatamente después si la cápsula tiene `autoDestruct: true`.

---

## 🔔 Bloque E: Activity Panel (UX)
**Objetivo**: Mejorar la visualización cronológica y la interacción en dispositivos móviles.

### Cambios Implementados
- **Agrupación Cronológica**: Los logs se agrupan por "Hoy", "Ayer", o fecha completa usando `useMemo`.
- **Sticky Headers**: Los títulos de fecha se quedan pegados arriba al hacer scroll para no perder el contexto temporal.
- **Interacción Mobile**: Se cambió `onMouseEnter` por `onClick` para marcar notificaciones como leídas, resolviendo el problema de interacción en pantallas táctiles.

---

## 🛠️ Mantenimiento y Auditoría Interna

### Archivos Modificados
| Archivo | Cambio Principal |
|---------|------------------|
| `firestore.rules` | Se permitió a Partners actualizar su propio campo `welcomeSeen`. |
| `BACKLOG.md` | **Nuevo archivo** de seguimiento para tareas pendientes de alta prioridad. |
| `useOfflineQueue.js` | Análisis de flujo de subida y callbacks de sincronización. |
| `PastelToast.jsx` | Análisis de límites de stack (3 toasts máx) y renderizado en viewport. |

### Estado Actual del Proyecto
- **Bloque D**: Finalizado y listo para pruebas.
- **Bloque E**: Finalizado y verificado (interacción + sticky headers).
- **Bloque F (Mapa)**: En fase de diseño (Pendiente aprobación para pins dinámicos y centro desde Config).
