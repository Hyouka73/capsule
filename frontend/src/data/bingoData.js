export const BINGO_SQUARES = Array(20).fill(null).map((_, i) => {
    // Simularemos algunas completadas y otras no
    const isCompleted = [0, 3, 5, 8, 12, 17, 19].includes(i);
    return {
        id: i.toString(),
        title: isCompleted ? `Misión ${i + 1}` : 'Misión Secreta',
        emoji: isCompleted ? 'favorite' : 'help_outline',
        isCompleted,
        memoryPhoto: isCompleted && i % 2 === 0 ? 'https://images.unsplash.com/photo-1549468057-5b6fb89cf61a?auto=format&fit=crop&q=80' : null,
        photos: isCompleted ? [
            'https://images.unsplash.com/photo-1549468057-5b6fb89cf61a?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'
        ] : [],
        completedAt: isCompleted ? new Date().toISOString() : null,
        description: isCompleted ? 'Día de picnic en el parque central' : 'Completa descubriendo este lugar especial.',
        minPhotos: 3
    };
});
