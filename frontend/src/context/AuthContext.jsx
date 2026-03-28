import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getToken, onMessage } from 'firebase/messaging';
import { arrayUnion, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, messaging, db } from '../services/firebase';
import firebaseConfig from '../config/firebase';
import {
    getCurrentUserClaims,
    signOut as authSignOut,
    registerWithEmail,
    callSetupRelationship,
} from '../services/auth';
import { ROLES, COLLECTIONS } from '../config/constants';
import User from '../models/User';
import { toast } from '../components/ui/PastelToast/PastelToast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [deviceId, setDeviceId] = useState(null);
    const [onboardingCompleted, setOnboardingCompleted] = useState(null);
    const [welcomeSeen, setWelcomeSeen] = useState(null);
    const [teaserCompleted, setTeaserCompleted] = useState(null);
    const [teaserLock, setTeaserLock] = useState(null);
    const [gameCoins, setGameCoins] = useState(0);
    const [accountStatus, setAccountStatus] = useState('active'); // 'active' | 'revoked' | 'pending'
    const [relationshipId, setRelationshipId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Register FCM Token for partners
    const registerFCM = useCallback(async (userId) => {
        try {
            // SKIP FCM in emulator mode to avoid logs and SW evaluation errors
            if (import.meta.env.VITE_USE_EMULATORS === 'true') {
                return;
            }

            // Wait for messaging to be initialized (it's lazy in firebase.js)
            let messagingInstance = messaging;
            if (!messagingInstance) {
                const { isSupported, getMessaging } = await import('firebase/messaging');
                if (await isSupported()) {
                    const { app } = await import('../services/firebase');
                    messagingInstance = getMessaging(app);
                }
            }

            if (!messagingInstance) return;

            const token = await getToken(messagingInstance, {
                vapidKey: firebaseConfig.vapidKey
            });
            if (token) {
                const userRef = doc(db, COLLECTIONS.USERS, userId);
                await updateDoc(userRef, {
                    fcmTokens: arrayUnion(token)
                });
            }
        } catch (err) {
            // error logged silently or handled by caller
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        let unsubscribeDoc = null;
        let unsubscribeMessaging = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            // Clean up previous doc listener if user changes
            if (unsubscribeDoc) {
                unsubscribeDoc();
                unsubscribeDoc = null;
            }

            if (firebaseUser) {
                if (isMounted) setIsLoading(true);
                
                // 1. Iniciar listener de Firestore INMEDIATAMENTE (paralelo)
                const userRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
                unsubscribeDoc = onSnapshot(userRef, (snapshot) => {
                    if (!isMounted) return;
                    
                    if (!snapshot.exists()) {
                        // GHOST SESSION FIX: Only force sign out if the SERVER confirms the document is missing.
                        // We ignore "missing" states from the local cache (metadata.fromCache: true) 
                        // as they are often false positives during the initial sync after login.
                        if (!snapshot.metadata.fromCache) {
                            console.warn('[AuthContext] User document missing on server. Forcing sign out.');
                            authSignOut();
                            setIsLoading(false);
                        }
                        return;
                    }

                    const data = snapshot.data();
                    console.log(`[AuthContext] User document loaded for UID: ${firebaseUser.uid}`, {
                        role: data.role,
                        teaserCompleted: data.teaserCompleted,
                        welcomeSeen: data.welcomeSeen,
                        relationshipId: data.relationshipId
                    });

                    setOnboardingCompleted(data.onboardingCompleted ?? null);
                    setWelcomeSeen(data.welcomeSeen ?? false);
                    setTeaserCompleted(data.teaserCompleted ?? false);
                    setTeaserLock(data.teaserLock || null);
                    setGameCoins(data.gameCoins ?? 0);
                    setAccountStatus(data.accountStatus || (data.isRevoked ? 'revoked' : 'active'));
                    setRelationshipId(data.relationshipId || null);
                    if (data.relationshipId) {
                        localStorage.setItem('capsule_relationship_id', data.relationshipId);
                    }
                    
                    // Fallback: If role is not in claims, take it from Firestore
                    if (!role && data.role) {
                        setRole(data.role);
                    }

                    // Defensive: If role is ADMIN, they shouldn't be blocked by teaser/welcome flags
                    if (data.role === 'admin' || role === 'admin') {
                        setTeaserCompleted(true);
                        setWelcomeSeen(true);
                    }

                    setIsLoading(false);
                }, (err) => {
                    if (isMounted) setIsLoading(false);
                });

                // 2. Obtener claims (sin forzar refresh, mucho más rápido)
                getCurrentUserClaims(false).then((claims) => {
                    if (!isMounted) return;
                    setUser(firebaseUser);
                    setRole(claims.role);
                    setRelationshipId(claims.relationshipId);
                    if (claims.relationshipId) {
                        localStorage.setItem('capsule_relationship_id', claims.relationshipId);
                    }
                    setDeviceId(claims.deviceId);

                    // Register FCM
                    if (claims.role === ROLES.PARTNER || claims.role === ROLES.ADMIN) {
                        registerFCM(firebaseUser.uid);
                    }
                }).catch(() => {
                    // if claims fail, we still wait for snapshot
                });

                if (!isMounted) {
                    unsubscribeDoc?.();
                    unsubscribeDoc = null;
                }
            } else {
                if (isMounted) {
                    setUser(null);
                    setRole(null);
                    setDeviceId(null);
                    setOnboardingCompleted(null);
                    setWelcomeSeen(null);
                    setTeaserCompleted(null);
                    setGameCoins(0);
                    setIsLoading(false);
                    localStorage.removeItem('capsule_relationship_id');
                }
            }
        });

        const setupMessagingListener = async () => {
            let messagingInstance = messaging;
            if (!messagingInstance) {
                const { isSupported, getMessaging } = await import('firebase/messaging');
                if (await isSupported()) {
                    const { app } = await import('../services/firebase');
                    messagingInstance = getMessaging(app);
                }
            }

            if (messagingInstance && isMounted) {
                unsubscribeMessaging = onMessage(messagingInstance, (payload) => {
                    if (!isMounted) return;
                    try {
                        const { title, body } = payload.notification || {};
                        if (title || body) {
                            toast.info(title || 'Nueva notificación', body || '');
                        }
                    } catch (err) {
                        // error logged silently
                    }
                });
            }
            if (!isMounted) unsubscribeMessaging?.();
        };

        setupMessagingListener();

        return () => {
            isMounted = false;
            unsubscribeAuth();
            if (unsubscribeDoc) unsubscribeDoc();
            if (unsubscribeMessaging) unsubscribeMessaging();
        };
    }, [registerFCM]);

    const signOut = useCallback(() => authSignOut(), []);

    // ─────────────────────────────────────────────────────────────────────────────
    // Registration Methods (OVERRIDE SKILL.md — controlled refactor)
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * registerAdmin — Creates Admin Firebase Auth account + scaffolds the relationship.
     * Calls setupRelationship Cloud Function to:
     *   - Generate relationshipId + partnerToken
     *   - Create placeholder partner user doc (accountStatus: 'pending')
     *   - Create appConfig/main
     *   - Set Admin custom claims including relationshipId
     *
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{ relationshipId: string, inviteUrl: string, partnerToken: string }>}
     */
    const registerAdmin = useCallback(async (email, password) => {
        try {
            // 1. Create Firebase Auth account for Admin
            const credential = await registerWithEmail(email, password);
            const adminUid = credential.user.uid;

            // 2. Scaffold the relationship (partner placeholder + appConfig)
            const result = await callSetupRelationship(adminUid);

            // 3. Force token refresh to pick up new custom claims (role + relationshipId)
            await credential.user.getIdToken(true);

            return {
                relationshipId: result.relationshipId,
                inviteUrl: result.inviteUrl,
                partnerToken: result.partnerToken,
            };
        } catch (err) {
            // error logged silently
            throw err;
        }
    }, []);

    /**
     * exchangeToken — Passwordless Join.
     * Exchange an invite token for a Custom Auth token locked to this device.
     * 
     * @param {string} inviteToken
     * @param {string} deviceFingerprint
     */
    const exchangeToken = useCallback(async (inviteToken, deviceFingerprint) => {
        try {
            const { exchangeInviteToken } = await import('../services/auth');
            const result = await exchangeInviteToken(inviteToken, deviceFingerprint);

            if (result.customToken) {
                await signInWithCustomToken(auth, result.customToken);
            }
        } catch (err) {
            console.error('[AuthContext] Exchange error:', err);
            throw err;
        }
    }, []);

    const completeTeaser = useCallback(async () => {
        if (!user?.uid) return;
        // Optimistic update: trigger navigation immediately
        setTeaserCompleted(true);
        try {
            const userRef = doc(db, COLLECTIONS.USERS, user.uid);
            await updateDoc(userRef, { teaserCompleted: true });
        } catch (err) {
            console.error("Error updating teaser:", err);
            // Rollback if critical (though for teaser, we usually want to let them in)
            // setTeaserCompleted(false); 
            throw err;
        }
    }, [user?.uid]);

    const completeWelcome = useCallback(async () => {
        if (!user?.uid) return;
        // Optimistic update: trigger navigation immediately
        setWelcomeSeen(true);
        try {
            const userRef = doc(db, COLLECTIONS.USERS, user.uid);
            await updateDoc(userRef, { welcomeSeen: true });
        } catch (err) {
            console.error("Error updating welcome:", err);
            // setWelcomeSeen(false);
            throw err;
        }
    }, [user?.uid]);

    const value = useMemo(() => ({
        user,
        role,
        deviceId,
        onboardingCompleted,
        welcomeSeen,
        teaserCompleted,
        teaserLock,
        gameCoins,
        accountStatus,
        relationshipId,
        isLoading,
        isAuthenticated: !!user,
        isRevoked: accountStatus === 'revoked',
        isAdmin: role === ROLES.ADMIN,
        isPartner: role === ROLES.PARTNER,
        signOut,
        registerAdmin,
        exchangeToken,
        completeTeaser,
        completeWelcome,
    }), [user, role, deviceId, onboardingCompleted, welcomeSeen, teaserCompleted, teaserLock, gameCoins, accountStatus, relationshipId, isLoading, signOut, registerAdmin, exchangeToken, completeTeaser, completeWelcome]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
