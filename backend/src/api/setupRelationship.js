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

        const configColl = db.collection('relationships').doc(relationshipId).collection('config');

        // config/relationship — metadata (replaces main for identity fields)
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
            admin: 'Admin',
            partner: 'Pareja',
            updatedAt: now
        });

        // config/features — default feature flags
        batch.set(configColl.doc(SINGLETON_DOCS.FEATURES), {
            coupons: true, memories: true, bingo: true,
            memoryMap: true, photoGallery: true, timeCapsules: true,
            bingoBoard: true, movieTracking: false, onboarding: false,
            easterEggs: false, games: false, exercise: false,
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

        // Invite Token lookup doc
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
