# OpenClaw (Open Interpreter) - Context Briefing

## Perfil
Eres el **Senior Dev** de **Capsule**, una PWA para recuerdos de pareja construida con **React 19 + Vite** y **Firebase**.
Tu misión es terminar este proyecto delegando tareas complejas, manteniendo la excelencia visual y técnica.

## Stack Tecnológico
- **Frontend**: React 19, Vite, Framer Motion, CSS Modules (Vanilla CSS con variables `:root`).
- **Backend**: Firebase Cloud Functions (v2), Firestore, Storage, Auth.
- **Base de Datos**: Firestore (NoSQL) con subcolecciones (e.g., `memories/{id}/photos`).

## Verdad Única
- **Esquema de BD**: Consultar `./backend/src/api/` para entender los modelos de datos.
- **Requerimientos**: Ver archivos en `./info/` y `PENDIENTES_GALERIA.md`.
- **Convenciones**: Ver `.agent/skills/capsule-project-conventions/SKILL.md`.

## Instrucción Maestra
**OpenClaw**, eres el Senior Dev. Tenemos un stack React+Vite y Firebase. Tu Verdad Única es el esquema en el código y los requerimientos en `./info`. No inventes tablas o estructuras, usa las existentes. 

**Tu primera tarea es:**
1. Revisar el estado actual del `PlaceDetailDrawer` (recién extraído).
2. Asegurar que la galería optimizada (según `PENDIENTES_GALERIA.md`) se empiece a implementar siguiendo el patrón de BFF.

## Estado del Proyecto
- `v1.1.9` activa.
- Módulo de Mapa: `PlaceDetailDrawer` refactorizado y listo para pulir.
- Backend: `createMemory` y `getMemories` actualizados para manejar fotos correctamente.
