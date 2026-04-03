import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';

export const handler = async (request) => {
    try {
        if (!request.auth) throw new HttpsError('unauthenticated', 'Debes estar autenticado');

        const { adminUid } = request.data || {};
        if (!adminUid) throw new HttpsError('invalid-argument', 'adminUid es requerido');
        if (request.auth.uid !== adminUid) throw new HttpsError('permission-denied', 'Only you can setup your account.');

        const db = getFirestore();
        const authAdmin = getAuth();
        const baseUrl = process.env.APP_URL || '';

        const adminDoc = await db.collection(COLLECTIONS.USERS).doc(adminUid).get();
        if (adminDoc.exists && adminDoc.data().relationshipId) {
            throw new HttpsError('already-exists', 'Relationship already exists.');
        }

        const relationshipId = uuidv4();
        const token = uuidv4().substring(0, 8).toUpperCase();

        const batch = db.batch();
        const now = Timestamp.now();

        // Admin User doc
        const adminRef = db.collection(COLLECTIONS.USERS).doc(adminUid);
        batch.set(adminRef, {
            uid: adminUid,
            email: request.auth.token.email || '',
            displayName: request.auth.token.name || 'Admin',
            role: 'admin',
            accountStatus: 'active',
            relationshipId,
            createdAt: now,
            lastActiveAt: now,
        }, { merge: true });

        // 4. Initialize comprehensive modular config
        const configColl = db.collection('relationships').doc(relationshipId).collection('config');

        // config/relationship — metadata
        batch.set(configColl.doc(SINGLETON_DOCS.RELATIONSHIP), {
            relationshipId,
            adminUid,
            partnerUid: null,
            status: 'active',
            createdAt: now,
            updatedAt: now
        });

        // config/names — Centralized display names
        batch.set(configColl.doc(SINGLETON_DOCS.NAMES), {
            admin: request.auth.token.name || 'Admin',
            partner: 'Pareja',
            updatedAt: now
        });

        // config/features — Global functionality flags
        batch.set(configColl.doc(SINGLETON_DOCS.FEATURES), {
            capsules: true, multimedia: true, snapshots: true, bingo: true,
            wrapped: false, teaser: true, photoGallery: true,
            memoryMap: true, timeCapsules: true, coupons: true,
            onboarding: true, movieTracking: false, exercise: false,
            games: false, easterEggs: false,
            updatedAt: now
        });

        // config/modules — Status + Onboarding per module
        batch.set(configColl.doc(SINGLETON_DOCS.MODULES_CONFIG), {
            capsules: { isEnabled: true, onboardingEnabled: true },
            snapshots: { isEnabled: true, onboardingEnabled: true },
            bingo: { isEnabled: true, onboardingEnabled: true },
            coupons: { isEnabled: true, onboardingEnabled: true },
            exercise: { isEnabled: false, onboardingEnabled: false },
            movies: { isEnabled: false, onboardingEnabled: false },
            updatedAt: now
        });

        // config/teaser — Launch countdown
        batch.set(configColl.doc(SINGLETON_DOCS.TEASER_CONFIG), {
            isEnabled: true,
            message: 'Algo especial está llegando...',
            revealDate: null,
            updatedAt: now
        });

        // config/visibility — Privacy levels
        batch.set(configColl.doc(SINGLETON_DOCS.VISIBILITY), {
            mapMemories: 'shared',
            gallery: 'shared',
            updatedAt: now
        });

        // config/notifications — Channels
        batch.set(configColl.doc(SINGLETON_DOCS.NOTIFICATIONS), {
            fcmEnabled: true,
            emailEnabled: true,
            types: ['memory', 'capsule', 'daily_moment', 'bingo'],
            updatedAt: now
        });

        // config/multimedia — Snapshots and Dates
        batch.set(configColl.doc(SINGLETON_DOCS.MULTIMEDIA), {
            snapshotConfig: { frequency: 'daily', maxPerDay: 1, retentionDays: 30 },
            citaConfig: { allowManual: true, maxActive: 3 },
            updatedAt: now
        });

        // config/map — Map aesthetics
        batch.set(configColl.doc(SINGLETON_DOCS.MAP_CONFIG), {
            defaultZoom: 12,
            defaultCenter: { lat: 0, lng: 0 },
            style: 'pastel',
            clustering: true,
            updatedAt: now
        });

        // config/onboarding — Progress State
        batch.set(configColl.doc(SINGLETON_DOCS.ONBOARDING), {
            isCompleted: false,
            step: 0,
            updatedAt: now
        });

        // config/inviteConfig — initial invite token
        batch.set(configColl.doc(SINGLETON_DOCS.INVITE_CONFIG), {
            token,
            inviteUrl: `${baseUrl}/join?t=${token}`,
            createdAt: now,
            isActive: true,
            updatedAt: now
        });

        // Invite Token lookup doc (external to relationship)
        batch.set(db.collection(COLLECTIONS.INVITE_TOKENS).doc(token), {
            token,
            relationshipId,
            adminUid,
            createdAt: now,
            expiresAt: null,
            isClaimed: false,
            isRevoked: false
        });

        await batch.commit();
        await authAdmin.setCustomUserClaims(adminUid, { role: 'admin', relationshipId });

        return { success: true, relationshipId, inviteUrl: `${baseUrl}/join?t=${token}` };
    } catch (error) {
        logger.error('setupRelationship error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error setting up relationship.');
    }
};
