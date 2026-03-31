import { v4 as uuidv4 } from 'uuid';

export default async function seedSnapshots(admin, db, relationshipId, adminUid, isFullSeed) {
    if (!isFullSeed) {
        console.log(`--- Skipping Snapshots for ${relationshipId} ---`);
        return;
    }

    console.log(`--- Seeding Snapshots for ${relationshipId} ---`);
    
    // Using high-quality Unsplash URLs to simulate Premium Storage photos
    const snapshots = [
        {
            caption: 'Nuestra primera foto de la mañana ☕',
            photoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600',
            location: 'Tuxtla Gutiérrez, Chiapas',
            isFavorite: true
        },
        {
            caption: 'Atardecer increíble juntos 🌅',
            photoUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=600',
            location: 'Cañón del Sumidero',
            isFavorite: false
        },
        {
            caption: 'Día de picnic en el parque 🧺',
            photoUrl: 'https://images.unsplash.com/photo-1526726533273-034874e0f06f?auto=format&fit=crop&q=80&w=600',
            location: 'Parque Joyyo Mayu',
            isFavorite: true
        }
    ];

    const relRef = db.collection('relationships').doc(relationshipId);
    const snapCollection = relRef.collection('snapshots');

    const batch = db.batch();
    
    for (const snap of snapshots) {
        const id = uuidv4();
        const ref = snapCollection.doc(id);
        batch.set(ref, {
            ...snap,
            id,
            relationshipId,
            takenBy: adminUid,
            metadata: {
                width: 600,
                height: 400,
                mimeType: 'image/jpeg'
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    
    await batch.commit();
    console.log(`✅ ${snapshots.length} Snapshots (Storage Photos) sembradas para ${relationshipId}.`);
}
