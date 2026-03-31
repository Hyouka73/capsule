export default async function seedCoupons(admin, db, relationshipId, adminUid, isFullSeed) {
    if (!isFullSeed) {
        console.log(`--- Skipping Coupons for ${relationshipId} ---`);
        return;
    }

    console.log(`--- Seeding Coupons for ${relationshipId} (Full State) ---`);

    const coupons = [
        {
            id: 'seed_coupon_1',
            title: 'Vale por una Cena Romántica',
            description: 'Incluye plato fuerte, bebidas y postre en el lugar que tú elijas.',
            reward: 'Cena Completa',
            type: 'simple',
            contentType: 'date_night',
            status: 'active',
            isLocked: false,
            relationshipId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
            id: 'seed_coupon_2',
            title: 'Pase Libre: Lavar los Platos',
            description: 'Válido para una noche de flojera total. ¡Yo me encargo!',
            reward: 'No lavar platos',
            type: 'simple',
            contentType: 'free_pass',
            status: 'active',
            isLocked: false,
            relationshipId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
            id: 'seed_coupon_3',
            title: 'Masaje Relajante de 30min',
            description: 'Para esos días de mucho estrés en el trabajo.',
            reward: 'Masaje 30min',
            type: 'simple',
            contentType: 'massage',
            status: 'used',
            usedAt: admin.firestore.Timestamp.now(),
            isLocked: false,
            relationshipId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
            id: 'seed_coupon_4',
            title: 'Cupón Sorpresa de Amor',
            description: 'Este cupón está bloqueado hasta que cumplas un reto especial.',
            reward: 'Regalo Sorpresa',
            type: 'simple',
            contentType: 'custom',
            status: 'active',
            isLocked: true,
            relationshipId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
    ];

    const couponsColl = db.collection('relationships').doc(relationshipId).collection('coupons');

    for (const coupon of coupons) {
        await couponsColl.doc(coupon.id).set(coupon);
    }

    console.log(`✅ ${coupons.length} Cupones sembrados para relación: ${relationshipId}`);
}
