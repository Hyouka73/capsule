# Backlog - Proyecto Capsule

## 🎯 Pendientes Bloque Bingo (implementar cuando toque)
- [ ] useBingo.js — caché local + onSnapshot (always be sync)
- [ ] BingoSuggestions offline — guardar en pending_bingo store en IndexedDB después de createMemory en processQueue
- [ ] Badge 💡 en tab Bingo cuando hay sugerencias pendientes
- [ ] Sheet automático primera vez al volver al home post-sync
      Si pospone → solo badge, no vuelve automático
- [ ] Validar localmente si casilla sigue sin completar 
      antes de sugerir (usar caché local del bingo)
- [ ] C2 INCOMPLETO: BingoSuggestionSheet no funciona 
      con offline-first. El sheet nunca aparece cuando 
      hay fotos porque queueMemory bypasea createMemory.
      BLOCKER: Requiere pending_bingo store + useBingo 
      caché local para funcionar correctamente.
      Implementar junto con el resto del bloque Bingo.

## 🔔 Pendientes Toasts (implementar pronto)
- [x] Eliminar toast "Sincronizando recuerdo..." 
      (useOfflineQueue.js ~L199)
- [x] Eliminar toast "Ubicación encontrada / centrando mapa"
      (buscar en archivos del mapa)
- [x] Bajar límite de toasts simultáneos de 3 a 2
      (PastelToast.jsx ~L58: .slice(0, 3) → .slice(0, 2))
