export default async function seedCoupons(admin, db, relationshipId, adminUid, isFullSeed) {
    if (!isFullSeed) {
        console.log(`--- Skipping Coupons for ${relationshipId} ---`);
        return;
    }

    console.log(`--- Seeding Coupons & Redemptions for ${relationshipId} ---`);

    const couponsColl = db.collection('relationships').doc(relationshipId).collection('coupons');
    const redemptionsColl = db.collection('relationships').doc(relationshipId).collection('redemptions');
    const activityColl = db.collection('relationships').doc(relationshipId).collection('activityLogs');

    // Partner UID dummy for seeding
    const PARTNER_ID = 'partner_uid_seed_1';

    const coupons = [
        {
            id: 'coupon_active_1',
            title: 'Vale por una Cena Romántica',
            description: 'Incluye plato fuerte, bebidas y postre en el lugar que tú elijas.',
            type: 'dates',
            tier: 3,
            status: 'active',
            redemptionsLeft: 1,
            maxRedemptions: 1,
            relationshipId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
            id: 'coupon_pending_2',
            title: 'Pase Libre: Lavar los Platos',
            description: 'Válido para una noche de descanso total.',
            type: 'tasks',
            tier: 1,
            status: 'active',
            redemptionsLeft: 1,
            maxRedemptions: 1,
            relationshipId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
    ];

    for (const coupon of coupons) {
        await couponsColl.doc(coupon.id).set(coupon);
    }

    // Seed Redemptions
    const redemptions = [
        {
            id: 'red_pending_msg',
            couponId: 'coupon_pending_2',
            couponTitle: 'Pase Libre: Lavar los Platos',
            status: 'pending_approval',
            requestedBy: PARTNER_ID,
            notes: 'Hoy he tenido un día muy largo...',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
    ];

    for (const red of redemptions) {
        await redemptionsColl.doc(red.id).set(red);
    }

    // Seed Activity Log
    await activityColl.add({
        relationshipId,
        userId: PARTNER_ID,
        action: 'coupon_requested',
        targetType: 'coupon',
        targetId: 'coupon_pending_2',
        redemptionId: 'red_pending_msg',
        displayText: 'Ha solicitado el canje del cupón "Pase Libre: Lavar los Platos"',
        metadata: { notes: 'Hoy he tenido un día muy largo...', couponTitle: 'Pase Libre: Lavar los Platos' },
        isReadByAdmin: false,
        readAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ ${coupons.length} Cupones y ${redemptions.length} Redenciones sembradas.`);
}
