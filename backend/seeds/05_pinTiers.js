export default async function seedPinTiers(admin, db, relationshipId, adminUid, isFullSeed) {
    if (!isFullSeed) {
        console.log(`--- Skipping PinTiers for ${relationshipId} (Clean State) ---`);
        return;
    }

    console.log(`--- Seeding PinTiers for ${relationshipId} (Full State) ---`);

    const places = [
        { id: 'place_1', name: 'Parque Central', visitCount: 1, lat: 16.7521, lng: -93.1152, tags: ['romántico'], city: 'Tuxtla Gutiérrez', category: 'cita', emoji: '🌳', photoCount: 2, createdBy: adminUid },
        { id: 'place_3', name: 'Plaza Las Flores', visitCount: 5, lat: 16.7551, lng: -93.1182, tags: ['comida'], city: 'Tuxtla Gutiérrez', category: 'cita', emoji: '🛍️', photoCount: 5, createdBy: adminUid },
        { id: 'place_10', name: 'Restaurante El Cielo', visitCount: 12, lat: 16.7611, lng: -93.1242, tags: ['cena'], city: 'Tuxtla Gutiérrez', category: 'cita', emoji: '🕯️', photoCount: 8, createdBy: adminUid },
        { id: 'place_mirador', name: 'Mirador Los Arcos', visitCount: 25, lat: 16.7651, lng: -93.1302, tags: ['vista'], city: 'Tuxtla Gutiérrez', category: 'cita', emoji: '🔭', photoCount: 15, createdBy: adminUid },
        { id: 'place_cine', name: 'Cinepolis Luxury', visitCount: 3, lat: 16.7421, lng: -93.1052, tags: ['cine'], city: 'Tuxtla Gutiérrez', category: 'cita', emoji: '🍿', photoCount: 4, createdBy: adminUid },
    ];

    for (const place of places) {
        const { lat, lng, ...rest } = place;
        const placeData = {
            ...rest,
            coordinates: { lat, lng },
            visitedBy: [
                {
                    relationshipId: relationshipId,
                    count: place.visitCount,
                    timestamp: new Date().toISOString()
                }
            ],
            visitedByRelationshipIds: [relationshipId],
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('places').doc(place.id).set(placeData, { merge: true });
    }


    // ── TARGETED CLEANUP: remove phantom legacy doc ──
    const configColl = db.collection('relationships').doc(relationshipId).collection('config');
    await configColl.doc('memoryTags').delete().catch(() => {}); // delete phantom doc if exists
    console.log(`🧹 Config legacy doc cleaned for ${relationshipId}.`);

    const now = admin.firestore.FieldValue.serverTimestamp();

    // 1. mapConfig → config/map  (SINGLETON_DOCS.MAP_CONFIG = 'map')
    await configColl.doc('map').set({
        pinTiers: [
            { minVisits: 1, color: '#cd7f32', scale: 0.8 },
            { minVisits: 5, color: '#c0c0c0', scale: 1.0 },
            { minVisits: 10, color: '#ffd700', scale: 1.2 },
            { minVisits: 20, color: '#b9f2ff', scale: 1.4 }
        ],
        updatedAt: now
    }, { merge: true });

    // 2. memoryTags → config/memoryTags  (SINGLETON_DOCS.MEMORY_TAGS = 'memoryTags')
    //    Stored as { tags: [...], updatedAt } — NOT as array directly
    //    SystemConfig.fromFirestore reads docs.memoryTags?.tags
    await configColl.doc('memoryTags').set({
        tags: [
            { id: 'tag_viaje',       label: 'Viaje',       emoji: '✈️'    },
            { id: 'tag_cita',        label: 'Cita',        emoji: '🍷'    },
            { id: 'tag_romantico',   label: 'Romántico',   emoji: '❤️'    },
            { id: 'tag_aniversario', label: 'Aniversario', emoji: '💝'    },
            { id: 'tag_random',      label: 'Random',      emoji: '🤪'    },
            { id: 'tag_logro',       label: 'Logro',       emoji: '🎯'    },
            { id: 'tag_hito',        label: 'Hito',        emoji: '🌟'    },
            { id: 'tag_familia',     label: 'Familia',     emoji: '👨‍👩‍👦'  },
            { id: 'tag_amigos',      label: 'Amigos',      emoji: '👯‍♂️'  },
            { id: 'tag_cine',        label: 'Cine',        emoji: '🍿'    },
            { id: 'tag_comida',      label: 'Comida',      emoji: '🍝'    },
            { id: 'tag_aventura',    label: 'Aventura',    emoji: '🌲'    },
            { id: 'tag_musica',      label: 'Música',      emoji: '🎵'    },
            { id: 'tag_relax',       label: 'Relax',       emoji: '💆‍♂️' },
            { id: 'tag_deporte',     label: 'Deporte',     emoji: '🏃‍♀️' },
            { id: 'tag_arte',        label: 'Arte',        emoji: '🎨'    },
            { id: 'tag_casa',        label: 'En Casa',     emoji: '🏠'    },
        ],
        updatedAt: now
    });

    console.log(`✅ Places, PinTiers y Tags configurados para ${relationshipId}.`);
}
