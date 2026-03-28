// TODO (v1.1): Implement rate limiting
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';

/**
 * setupRelationship — HTTPS Callable (Admin-only)
 *
 * Called immediately after Admin registration. Creates the full 1-to-1
 * relationship scaffold:
 *   - Updates Admin user doc with role + relationshipId
 *   - Creates placeholder Partner user doc (accountStatus: 'pending')
 *   - Creates /appConfig/main with relationshipId + partnerToken + modules
 *   - Injects relationshipId into Admin custom claims
 *
 * Input:  { adminUid: string }
 * Output: { success, relationshipId, partnerToken, inviteUrl }
 */
export const setupRelationship = onCall({ region: 'us-central1', cors: true }, async (request) => {
    try {
        // 1. Auth check — caller must be authenticated
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Debes estar autenticado');
        }

        const { adminUid } = request.data;

        if (!adminUid) {
            throw new HttpsError('invalid-argument', 'adminUid es requerido');
        }

        // Must match the caller's uid
        if (request.auth.uid !== adminUid) {
            throw new HttpsError('permission-denied', 'Solo puedes configurar tu propia cuenta');
        }

        const db = getFirestore();
        const authAdmin = getAuth();
        const baseUrl = process.env.APP_URL || '';

        // 2. Guard: Check if this admin already has a relationship
        const adminDoc = await db.collection(COLLECTIONS.USERS).doc(adminUid).get();
        if (adminDoc.exists && adminDoc.data().relationshipId) {
            logger.warn(`Admin ${adminUid} attempted duplicate setupRelationship`);
            throw new HttpsError('already-exists', 'Esta cuenta ya tiene una relación configurada');
        }

        // 3. Generate unique relationship IDs
        const relationshipId = uuidv4();
        const partnerToken = uuidv4();

        const appConfigRef = db
            .collection('relationships')
            .doc(relationshipId)
            .collection('config')
            .doc(SINGLETON_DOCS.APP_CONFIG);

        // 4. Create a placeholder Firebase Auth user for the partner
        //    (no email/password yet — partner will claim via invite link)
        const partnerRecord = await authAdmin.createUser({
            displayName: 'Partner',
        });
        const partnerUid = partnerRecord.uid;

        const now = Timestamp.now();

        // 5. Batch all Firestore writes
        const batch = db.batch();

        // 5a. Update Admin user doc
        const adminRef = db.collection(COLLECTIONS.USERS).doc(adminUid);
        batch.set(adminRef, {
            uid: adminUid,
            email: request.auth.token.email || '',
            displayName: request.auth.token.name || 'Admin',
            role: 'admin',
            accountStatus: 'active',
            relationshipId,
            partnerToken, // solo admins
            fcmTokens: [],
            gameCoins: 0,
            welcomeSeen: false,
            teaserCompleted: true, // Admin skips teaser
            teaserLock: null,
            preferences: {
                theme: 'dark',
                language: 'es',
                notificationsEnabled: true,
                galleryOrderBy: 'eventDate',
            },
            onboardingCompleted: {
                map: false, bingo: false, capsules: false,
                coupons: false, snapshots: false,
                gallery: false, movies: false, games: false,
            },
            createdAt: now,
            lastActiveAt: now,
        }, { merge: true });

        batch.set(partnerRef, {
            uid: partnerUid,
            email: '', // Not known yet
            displayName: 'Partner',
            role: 'partner',
            accountStatus: 'pending',
            relationshipId,
            adminUid, // solo partners
            fcmTokens: [],
            gameCoins: 0,
            welcomeSeen: false,
            teaserCompleted: false,
            teaserLock: null,
            preferences: {
                theme: 'dark',
                language: 'es',
                notificationsEnabled: true,
                galleryOrderBy: 'eventDate',
            },
            onboardingCompleted: {
                map: false, bingo: false, capsules: false,
                coupons: false, snapshots: false,
                gallery: false, movies: false, games: false,
            },
            createdAt: now,
            lastActiveAt: now,
        });

        // 5c. Create the global invite token (Global lookup)
        const inviteTokenRef = db.collection(COLLECTIONS.INVITE_TOKENS).doc(partnerToken);
        batch.set(inviteTokenRef, {
            token: partnerToken,
            relationshipId,
            createdBy: adminUid,
            createdAt: now,
            expiresAt: null, // Initial setup token doesn't expire by default
            isClaimed: false,
            isRevoked: false,
        });

        // 5d. Create appConfig/main
        batch.set(appConfigRef, {
            partnerUid,
            relationshipId,
            inviteConfig: {
                inviteLink: `${baseUrl}/join?t=${partnerToken}`,
                generatedAt: now.toDate().toISOString(),
                expiresAt: null,
                isActive: true
            },
            modules: {
                bingo: { isEnabled: true },
                capsules: { isEnabled: true },
                coupons: { isEnabled: true },
                snapshots: { isEnabled: true },
                movies: { isEnabled: true },
            },
            teaserLock: null,
            features: {
                memoryMap: true,
                photoGallery: true,
                timeCapsules: true,
                coupons: true,
                bingoBoard: true,
                movieTracking: false,
                onboarding: false,
                easterEggs: false,
                games: false,
                exercise: false,
            },
            visibility: { showAdminNotes: false },
            notifications: {
                partnerFcmEnabled: true,
                adminActivityLogEnabled: true,
            },
            teaser: { unlockAt: '2026-04-04T00:00:00Z', isEnabled: true },
            partner: { welcomeMessage: '¡Bienvenida a nuestro espacio! 💖', displayName: '' },
            createdAt: now,
            updatedAt: now,
        }, { merge: false }); // Strict create — don't merge over existing

        await batch.commit();

        // 6. Inject relationshipId into Admin's custom claims
        await authAdmin.setCustomUserClaims(adminUid, {
            role: 'admin',
            relationshipId,
        });

        const inviteUrl = `${baseUrl}/join?t=${partnerToken}`;

        logger.info(`Relationship ${relationshipId} created by admin ${adminUid}. Partner UID: ${partnerUid}`);

        return {
            success: true,
            relationshipId,
            partnerToken,
            partnerUid,
            inviteUrl,
        };
    } catch (error) {
        // Log interno para trazabilidad
        logger.error('setupRelationship error:', {
            uid: request.auth?.uid,
            error: error.message,
            stack: error.stack
        });

        if (error instanceof HttpsError) throw error;

        throw new HttpsError(
            'internal',
            'Error al configurar la relación. Por favor, intenta de nuevo.'
        );
    }
});
