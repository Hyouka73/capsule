export const MOCK_PLACES = [
    {
        id: 'p1',
        name: 'Plaza Ambar',
        emoji: '🎬',
        coordinates: { lat: 16.7380, lng: -93.0800 },
        visitCount: 6,
        coverPhotoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
        lastVisitDate: '14 Feb 2026',
        tags: ['cine', 'comida'],
        visits: [
            {
                id: 'v1',
                date: '14 Feb 2026',
                coverPhoto: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
                photos: [
                    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1585647347384-2593bc35786b?auto=format&fit=crop&w=800&q=80',
                ]
            },
            {
                id: 'v2',
                date: '02 Feb 2026',
                coverPhoto: 'https://images.unsplash.com/photo-1481070555726-e2fe83477d4a?auto=format&fit=crop&w=200&q=80',
                photos: [
                    'https://images.unsplash.com/photo-1481070555726-e2fe83477d4a?auto=format&fit=crop&w=800&q=80',
                ]
            }
        ]
    },
    {
        id: 'p2',
        name: 'Parque de la Marimba',
        emoji: '🌸',
        coordinates: { lat: 16.7533, lng: -93.1182 },
        visitCount: 3,
        coverPhotoUrl: 'https://images.unsplash.com/photo-1582216669966-22ac585a73e5?auto=format&fit=crop&w=200&q=80',
        lastVisitDate: '28 Ene 2026',
        tags: ['romántico'],
        visits: [
            {
                id: 'v3',
                date: '28 Ene 2026',
                coverPhoto: 'https://images.unsplash.com/photo-1582216669966-22ac585a73e5?auto=format&fit=crop&w=200&q=80',
                photos: [
                    'https://images.unsplash.com/photo-1582216669966-22ac585a73e5?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1522748906645-95d8ad85fa4b?auto=format&fit=crop&w=800&q=80',
                ]
            }
        ]
    },
    {
        id: 'p3',
        name: 'Cañón del Sumidero',
        emoji: '🏔️',
        coordinates: { lat: 16.8200, lng: -93.0900 },
        visitCount: 1,
        coverPhotoUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=200&q=80',
        lastVisitDate: '01 Nov 2025',
        tags: ['aventura'],
        visits: [
            {
                id: 'v4',
                date: '01 Nov 2025',
                coverPhoto: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=200&q=80',
                photos: [
                    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80',
                ]
            }
        ]
    },
    {
        id: 'p4',
        name: 'Cafetería Bonita',
        emoji: '☕',
        coordinates: { lat: 16.7500, lng: -93.1100 },
        visitCount: 5,
        coverPhotoUrl: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=200&q=80',
        lastVisitDate: '20 Feb 2026',
        tags: ['comida', 'romántico'],
        visits: [
            {
                id: 'v5',
                date: '20 Feb 2026',
                coverPhoto: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=200&q=80',
                photos: [
                    'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
                ]
            },
            {
                id: 'v6',
                date: '10 Feb 2026',
                coverPhoto: 'https://images.unsplash.com/photo-1514066558159-fc8c737ef259?auto=format&fit=crop&w=200&q=80',
                photos: [
                    'https://images.unsplash.com/photo-1514066558159-fc8c737ef259?auto=format&fit=crop&w=800&q=80',
                ]
            },
            {
                id: 'v7',
                date: '01 Ene 2026',
                coverPhoto: 'https://images.unsplash.com/photo-1445116572660-236099ae4624?auto=format&fit=crop&w=200&q=80',
                photos: [
                    'https://images.unsplash.com/photo-1445116572660-236099ae4624?auto=format&fit=crop&w=800&q=80',
                ]
            }
        ]
    }
];

export const ALL_POSSIBLE_FILTERS = [
    { id: 'todos', label: 'Todos', icon: 'favorite' },
    { id: 'cine', label: 'Cine', icon: 'movie' },
    { id: 'comida', label: 'Comida', icon: 'restaurant' },
    { id: 'romántico', label: 'Romántico', icon: 'local_florist' },
    { id: 'aventura', label: 'Aventura', icon: 'hiking' },
    { id: 'relajación', label: 'Relajación', icon: 'spa' },
    { id: 'fiesta', label: 'Fiesta', icon: 'celebration' },
    { id: 'misterioso', label: 'Misterioso', icon: 'help_center' }
];

export const MOCK_PENDING_DATES = [
    {
        id: 'pnd1',
        originalDate: 'Hoy, 6:00 PM',
        coverPhoto: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
        photos: [
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
            'https://images.unsplash.com/photo-1585647347384-2593bc35786b'
        ],
        isFromBingo: false,
    },
    {
        id: 'pnd2',
        originalDate: 'Ayer, 8:30 PM',
        coverPhoto: 'https://images.unsplash.com/photo-1582216669966-22ac585a73e5?auto=format&fit=crop&w=200&q=80',
        photos: [
            'https://images.unsplash.com/photo-1582216669966-22ac585a73e5'
        ],
        suggestedTags: ['romántico', 'comida'],
        isFromBingo: true,
    }
];
