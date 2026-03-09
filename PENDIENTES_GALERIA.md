# Propuesta de Optimización de Galería (PENDIENTE)

Esta propuesta aborda la eficiencia a largo plazo de la galería conforme el número de fotos y momentos crezca. Actualmente utilizamos un BFF (Backend For Frontend) que simplifica la lógica, pero podemos evolucionar hacia un sistema más escalable.

## 1. Paginación Basada en Cursores (Escalabilidad)
Actualmente el `getGallery` trae los últimos 30 elementos. Para manejar miles de fotos sin degradar el rendimiento:
- **Implementación**: Pasar un `lastCreatedAt` y `lastId` desde el cliente.
- **Backend**: Usar `.startAfter(timestamp)` en las consultas de Firestore para ambos conjuntos (Fotos y Snapshots).
- **Frontend**: El hook `useGallery` mantendrá el estado acumulado para no re-descargar lo que ya se mostró.

## 2. Caché de Segundo Nivel (Service Worker)
Aunque ya excluimos las APIs de Firebase del cache persistente para evitar errores de red, podemos implementar una estrategia **Stale-While-Revalidate** específica para la respuesta del JSON de la galería.
- **Beneficio**: Los usuarios ven las fotos casi instantáneamente al abrir la app, y se actualiza en segundo plano si hay nuevos momentos.
- **¿Donde se guarda?**: 
    - **Cache Storage API**: Es un almacenamiento especial del navegador (parte del PWA) diseñado para guardar peticiones de red (JSON e Imágenes). Es persistente (no se borra al cerrar la app).
    - **IndexedDB**: Para metadatos más complejos o el "GalleryManifest" pre-calculado, se usaría esta base de datos local para búsquedas ultra-rápidas sin red.

## 3. Virtualización del Grid (Rendimiento UI)
Si la galería llega a tener 500+ elementos en el DOM, el scroll puede volverse pesado en móviles.
- **Propuesta**: Usar `react-window` o un Intersection Observer manual para renderizar solo las filas visibles en el viewport.

## 4. Agregación Pre-calculada (Costo de Lecturas)
Si el volumen de fotos es masivo:
- **Implementación**: Un trigger de Cloud Functions que mantenga un documento "GalleryManifest" con los últimos 50 punteros a fotos.
- **Beneficio**: 1 lectura de documento = 50 fotos iniciales.

---

> [!NOTE]
> Por ahora, la versión `v1.1.9` utiliza un BFF simple con miniaturas, lo cual es suficiente para el volumen actual y soluciona el problema de "fotos perdidas". Estas mejoras se implementarán conforme la base de datos crezca.
