import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

const db = getFirestore();

async function seedConfig() {
    const config = {
        features: {
            memoryMap: true,
            photoGallery: true,
            timeCapsules: true,
            onboarding: false,
            coupons: true,
            bingoBoard: true,
            movieTracking: false,
            easterEggs: false,
            games: false,
            exercise: false,
        },
        visibility: {
            showAdminNotes: false,
        },
        wrapped: {
            anniversaryDate: '04-04',
            anniversaryYear: 2022,
            nextWrappedDate: '2026-04-04',
            defaultStatsMode: 'eventDate',
        },
        map: {
            defaultCenter: { lat: 16.7521, lng: -93.1152 },
            defaultZoom: 12,
            style: 'romantic-vintage',
        },
        notifications: {
            partnerFcmEnabled: true,
            adminActivityLogEnabled: true,
        },
        snapshotConfig: {
            timerSeconds: 9,
        },
        inviteConfig: {
            inviteLink: 'https://app.tu-dominio.com/invite/baka-love-2026',
        },
        citaConfig: {
            minPhotosSpontaneous: 5,
            minPhotosBingoDefault: 3,
        },
        updatedAt: new Date().toISOString()
    };

    console.log('Seeding appConfig/main...');
    await db.collection('appConfig').doc('main').set(config);
    console.log('Successfully seeded appConfig/main!');
}

seedConfig().catch(err => {
    console.error('Error seeding config:', err);
    process.exit(1);
});
