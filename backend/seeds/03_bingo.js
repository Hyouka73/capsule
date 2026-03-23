export default async function seedBingo(admin, db) {
    console.log('--- Seeding Bingo ---');

    const categories = [
        { id: 'cine', title: 'Ir al cine', emoji: '🍿', minPhotos: 1, completedMemoryId: null, suggestedTags: [{ value: 'cine', label: 'Cine 🍿' }], completedAt: null },
        { id: 'cena', title: 'Cena romántica', emoji: '🍝', minPhotos: 1, completedMemoryId: null, suggestedTags: [{ value: 'comida', label: 'Comida 🍝' }], completedAt: null },
        { id: 'viaje', title: 'Viaje a la playa', emoji: '🏖️', minPhotos: 1, completedMemoryId: null, suggestedTags: [{ value: 'viaje', label: 'Viaje ✈️' }], completedAt: null },
        { id: 'aventura', title: 'Paseo en bosque', emoji: '🌲', minPhotos: 3, completedMemoryId: null, suggestedTags: [{ value: 'aventura', label: 'Aventura 🌲' }], completedAt: null },
        { id: 'musica', title: 'Nuestra canción', emoji: '🎵', minPhotos: 1, completedMemoryId: null, suggestedTags: [{ value: 'musica', label: 'Música 🎵' }], completedAt: null },
        { id: 'relax', title: 'Tarde de spa', emoji: '💆‍♂️', minPhotos: 1, completedMemoryId: null, suggestedTags: [{ value: 'relax', label: 'Relax 💆‍♂️' }], completedAt: null }
    ];
    
    // Rellenamos el resto para armar un board de 16 casillas (4x4)
    for (let i = 7; i <= 16; i++) {
        categories.push({ id: `cat${i}`, title: `Reto ${i}`, emoji: '⭐', minPhotos: 1, completedMemoryId: null, suggestedTags: [], completedAt: null });
    }

    await db.collection('bingoBoard').doc('board').set({
        categories: categories,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Tablero de Bingo inicializado (16 casillas).');
}
