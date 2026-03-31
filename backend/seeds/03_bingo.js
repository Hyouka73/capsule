export default async function seedBingo(admin, db, relationshipId, adminUid, isFullSeed) {
    console.log(`--- Seeding Bingo for ${relationshipId} ---`);

    const categories = [
        { 
            id: 'cine', 
            title: 'Ir al cine', 
            emoji: '🍿', 
            minPhotos: 1, 
            suggestedTags: [
                { value: 'cine', label: 'Cine 🍿' },
                { value: 'romántico', label: 'Romántico ❤️' }
            ], 
            isSpecial: false, 
            isEnabled: true 
        },
        { 
            id: 'cena', 
            title: 'Cena romántica', 
            emoji: '🍝', 
            minPhotos: 1, 
            suggestedTags: [
                { value: 'comida', label: 'Comida 🍕' },
                { value: 'especial', label: 'Especial ✨' }
            ], 
            isSpecial: true, 
            isEnabled: true 
        },
        { id: 'viaje', title: 'Viaje a la playa', emoji: '🏖️', minPhotos: 1, suggestedTags: [{ value: 'viaje', label: 'Viaje ✈️' }], isSpecial: false, isEnabled: true },
        { id: 'aventura', title: 'Paseo en bosque', emoji: '🌲', minPhotos: 3, suggestedTags: [{ value: 'aventura', label: 'Aventura 🌲' }], isSpecial: false, isEnabled: true },
        { id: 'musica', title: 'Nuestra canción', emoji: '🎵', minPhotos: 1, suggestedTags: [{ value: 'musica', label: 'Música 🎵' }], isSpecial: false, isEnabled: true },
        { id: 'relax', title: 'Tarde de spa', emoji: '💆‍♂️', minPhotos: 1, suggestedTags: [{ value: 'relax', label: 'Relax 💆‍♂️' }], isSpecial: true, isEnabled: true }
    ];
    
    // Fill up to 16
    for (let i = categories.length + 1; i <= 16; i++) {
        categories.push({ 
            id: `cat${i}`, 
            title: `Reto ${i}`, 
            emoji: '⭐', 
            minPhotos: 1, 
            suggestedTags: [], 
            isEnabled: true
        });
    }

    // Apply completion logic if Full Seed
    const finalCategories = categories.map((cat, index) => {
        if (isFullSeed && index !== 0) {
            // Index 0 is (0,0). Indices 1-15 are the rest.
            return {
                ...cat,
                completedMemoryId: `seed_mem_${(index % 3) + 1}`, // Cycle through existing seed memories
                completedAt: admin.firestore.Timestamp.now(),
                isCompleted: true
            };
        }
        return {
            ...cat,
            completedMemoryId: null,
            completedAt: null,
            isCompleted: false
        };
    });

    const bingoRef = db.collection('relationships').doc(relationshipId).collection('bingoBoards').doc('board');
    await bingoRef.set({
        id: 'board',
        status: 'active',
        categories: finalCategories,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log(`✅ Tablero de Bingo inicializado para ${relationshipId}. (FullSeed: ${isFullSeed ? '15/16' : '0/16'})`);
}
