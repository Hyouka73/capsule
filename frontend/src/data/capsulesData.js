export const MOCK_CAPSULES = [
    {
        id: '1',
        teaserMessage: 'Palabras del corazón...',
        type: 'gift',
        status: 'locked',
        opensInDays: 3
    },
    {
        id: '2',
        teaserMessage: 'Un recuerdo congelado...',
        type: 'photo',
        status: 'unlocked',
        content: { text: 'Nuestra primera foto' }
    },
    {
        id: '3',
        title: 'Nuestra primera cita',
        type: 'video',
        status: 'destructible',
        destroysInHours: 5,
        content: { url: 'https://example.com/video.mp4' }
    },
    {
        id: '4',
        teaserMessage: 'Escucha mi voz...',
        type: 'audio',
        status: 'unlocked',
        content: { text: 'Un mensaje de voz' }
    },
    {
        id: '5',
        teaserMessage: 'Nuestra canción especial...',
        type: 'link',
        status: 'unlocked',
        domain: 'spotify.com',
        content: { url: 'https://open.spotify.com/track/123' }
    },
    {
        id: '6',
        teaserMessage: 'Vale por un abrazo...',
        type: 'coupon',
        status: 'unlocked',
        content: { text: 'Vale por un abrazo fuerte' }
    },
    {
        id: '7',
        teaserMessage: 'Detalles importantes...',
        type: 'pdf',
        status: 'unlocked',
        content: { url: 'https://example.com/reglas.pdf' }
    },
];
