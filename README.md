# 💜 Capsule — Offline-First Progressive Web App

> **Tipo de proyecto:** Proyecto Personal / Portafolio UX-UI & Modern Web Engineering  
> **Estado:** Activo  
> **Autor:** [Hyouka73](https://github.com/Hyouka73)

---

## 📖 Descripción del Proyecto

**Capsule** es una Progressive Web App (PWA) con arquitectura **Offline-First** diseñada para documentar, resguardar y celebrar momentos significativos de forma interactiva y privada. 

Combina una experiencia visual cuidada (diseño UX/UI propio con microinteracciones y componentes fluidos) con funciones sociales efímeras: formato de **historias/snapshots temporales** bajo un protocolo de visualización única (*Read-Once*), desbloqueo programado de cápsulas de tiempo mediante tareas en la nube y persistencia de datos local garantizada incluso sin conexión a internet.

---

## 📸 Capturas de Pantalla y Demostración Visual

> 💡 **Nota para evaluación del portafolio:** A continuación se indican las vistas clave recomendadas para captura de pantalla / demo:
>
> 1. **Vista Mobile / PWA Feed:** Interfaz principal con navegación fluida, indicador de conectividad offline y feed de recuerdos.
> 2. **Snapshots Efímeros ("Historias"):** Reproductor de snapshots efímeros a pantalla completa con temporizador de progreso y animación de transición estilo redes sociales.
> 3. **Interactive Photo Reveal / Teaser:** Experiencia interactiva de revelación de tarjetas con gestos táctiles.
> 4. **Tablero Interactivo & Map Picker:** Selector de ubicaciones sobre MapLibre GL con caché offline de coordenadas y lugares favoritos.

*(Para añadir capturas directamente al README, ubica los archivos en `docs/screenshots/` y referencia aquí con `![Feed](docs/screenshots/feed.png)`).*

---

## ⚡ Características Principales

- **Arquitectura Offline-First con IndexedDB:**
  - Persistencia de transacciones, imágenes en caché binario (Blobs) y sincronización en segundo plano (*Background Sync*).
  - Cola de acciones pendientes (`capsule_offline_queue`) que despacha automáticamente mutaciones a la nube al recuperar la conectividad.
- **Historias y Recuerdos Efímeros (Snapshots):**
  - Sistema de publicación tipo historias de redes sociales con temporizador de expiración.
  - Implementación del protocolo **Read-Once**: el contenido se marca como visto de manera optimista en local y se purga remotamente.
- **Cápsulas de Tiempo con Desbloqueo Programado:**
  - Programación de apertura diferida orquestada con Google Cloud Tasks y Cloud Functions.
- **Diseño UX/UI Propietario & Microinteracciones:**
  - Sistema de diseño moderno desarrollado con Tailwind CSS v4 y animaciones avanzadas en Framer Motion.
  - Notificaciones no intrusivas con componentes flotantes estilo *Dynamic Island*.
- **PWA Instalable & Notificaciones Push:**
  - Service Worker nativo (Workbox) con estrategia de caché `Stale-While-Revalidate`.
  - Notificaciones en segundo plano a través de Firebase Cloud Messaging (FCM).

---

## 🛠️ Stack Tecnológico

### Frontend
- **Framework:** [React 19](https://react.dev/) + [Vite 7](https://vitejs.dev/)
- **Estilos & UI:** [Tailwind CSS v4](https://tailwindcss.com/), Lucide Icons, Radix UI primitives
- **Animaciones:** [Framer Motion 12](https://www.framer.com/motion/)
- **Persistencia Local:** [IndexedDB API](https://developer.mozilla.org/es/docs/Web/API/IndexedDB_API) nativa para caché estructurado de fotos, lugares y cola de subida
- **Mapas y Geolocalización:** [MapLibre GL](https://maplibre.org/)
- **PWA & Service Worker:** `vite-plugin-pwa`, Workbox, Firebase Cloud Messaging SW

### Backend & Cloud Infrastructure
- **BaaS:** [Google Firebase](https://firebase.google.com/) (Firestore DB, Firebase Storage, Firebase Authentication)
- **Cómputo Serverless:** Firebase Cloud Functions (Node.js) como Serverless BFF
- **Automatización & Cron:** Google Cloud Tasks para eventos temporizados y expiración de contenido

---

## 🚀 Instalación y Ejecución Local

### Prerrequisitos
- Node.js (v18 o superior)
- npm / pnpm

### 1. Clonar el repositorio
```bash
git clone https://github.com/Hyouka73/capsule.git
cd capsule
```

### 2. Configurar Variables de Entorno
Copia la plantilla de variables para el frontend:
```bash
cp frontend/.env.example frontend/.env
```
Completa las variables de tu proyecto de Firebase en `frontend/.env`:
```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
VITE_FIREBASE_VAPID_KEY=tu_vapid_key
VITE_USE_EMULATORS=false
```

### 3. Instalar Dependencias
```bash
# Frontend
cd frontend
npm install

# Backend / Functions (opcional para desarrollo cloud)
cd ../backend
npm install
```

### 4. Ejecutar el Servidor de Desarrollo
```bash
cd ../frontend
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

### 5. Compilar para Producción
```bash
npm run build
npm run preview
```

---

## 📄 Licencia
Este proyecto fue creado con fines de demostración técnica y portafolio profesional. Código liberado bajo licencia [MIT](LICENSE).
