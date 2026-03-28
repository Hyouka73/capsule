export default async function seedBingo(admin, db) {
    console.log('--- Seeding Bingo ---');
    const REL_ID = 'capsule_development_rel_123';

    const categories = [
        { id: 'cine', title: 'Ir al cine', emoji: '🍿', minPhotos: 1, completedMemoryId: null, suggestedTags: [{ value: 'cine', label: 'Cine 🍿' }], completedAt: null, isSpecial: false, isEnabled: true },
        { id: 'cena', title: 'Cena romántica', emoji: '🍝', minPhotos: 1, completedMemoryId: null, suggestedTags: [{ value: 'comida', label: 'Comida 🍝' }], completedAt: null, isSpecial: true, isEnabled: true },
        { id: 'viaje', title: 'Viaje a la playa', emoji: '🏖️', minPhotos: 1, completedMemoryId: null, suggestedTags: [{ value: 'viaje', label: 'Viaje ✈️' }], completedAt: null, isSpecial: false, isEnabled: true },
        { id: 'aventura', title: 'Paseo en bosque', emoji: '🌲', minPhotos: 3, completedMemoryId: null, suggestedTags: [{ value: 'aventura', label: 'Aventura 🌲' }], completedAt: null, isSpecial: false, isEnabled: true },
        { id: 'musica', title: 'Nuestra canción', emoji: '🎵', minPhotos: 1, completedMemoryId: null, suggestedTags: [{ value: 'musica', label: 'Música 🎵' }], completedAt: null, isSpecial: false, isEnabled: true },
        { id: 'relax', title: 'Tarde de spa', emoji: '💆‍♂️', minPhotos: 1, completedMemoryId: null, suggestedTags: [{ value: 'relax', label: 'Relax 💆‍♂️' }], completedAt: null, isSpecial: true, isEnabled: true }
    ];
    
    for (let i = categories.length + 1; i <= 16; i++) {
        categories.push({ 
            id: `cat${i}`, 
            title: `Reto ${i}`, 
            emoji: '⭐', 
            minPhotos: 1, 
            completedMemoryId: null, 
            suggestedTags: [], 
            enabled: true
        });
    }

    const bingoRef = db.doc(`relationships/${REL_ID}/bingo/board`);
    await bingoRef.set({
        categories: categories,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Tablero de Bingo inicializado para ${REL_ID}.`);
}
