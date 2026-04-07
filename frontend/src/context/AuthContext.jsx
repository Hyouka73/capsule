import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { doc, updateDoc, onSnapshot, writeBatch, serverTimestamp, deleteField } from 'firebase/firestore';
import { auth, messaging, db } from '../services/firebase';
import firebaseConfig from '../config/firebase';
import {
    getCurrentUserClaims,
    signOut as authSignOut,
    registerWithEmail,
    callSetupRelationship,
    callRepairAuth,
} from '../services/auth';
import { ROLES, COLLECTIONS } from '../config/constants';
import User from '../models/User';
import { toast } from '../components/ui/PastelToast/PastelToast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [deviceId, setDeviceId] = useState(null);
    const [onboardingCompleted, setOnboardingCompleted] = useState(false);
    const [welcomeSeen, setWelcomeSeen] = useState(false);
    const [teaserCompleted, setTeaserCompleted] = useState(false);
    const [teaserLock, setTeaserLock] = useState(null);
    const [gameCoins, setGameCoins] = useState(0);
    const [accountStatus, setAccountStatus] = useState(null); // 'active' | 'revoked' | 'pending' | null (loading)
    const [relationshipId, setRelationshipId] = useState(localStorage.getItem('capsule_relationship_id') || null);
    const [isLoading, setIsLoading] = useState(true);
    const initialAuthChecked = useRef(false);
    const authTimeRef = useRef(null);

    // Register FCM Token for partners
    const registerFCM = useCallback(async (userId) => {
        try {
            // Only skip if messaging isn't supported or initialized
            if (!messaging) {
                const { isSupported } = await import('firebase/messaging');
                if (!(await isSupported())) return;
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

            try {
                await deleteToken(messagingInstance);
            } catch (_) {
                // No hay token previo, está bien
            }

            const token = await getToken(messagingInstance, {
                vapidKey: firebaseConfig.vapidKey
            });
            if (token) {
                const userRef = doc(db, COLLECTIONS.USERS, userId);
                const tokenData = {
                    active: true,
                    updatedAt: serverTimestamp()
                };

                try {
                    await updateDoc(userRef, {
                        [`fcmTokens.${token}`]: tokenData
                    });
                } catch (updateErr) {
                    // SELF-HEALING: If the field is currently an array (legacy), updateDoc with dot-notation will fail.
                    // We catch the error, delete the old array field, and set the new map field.
                    console.warn('[AuthContext] FCM schema mismatch detected. Healing database...');
                    await updateDoc(userRef, { fcmTokens: deleteField() });
                    await updateDoc(userRef, {
                        [`fcmTokens.${token}`]: tokenData
                    });
                }
            }
        } catch (err) {
            console.error('[FCM] registerFCM failed:', err.code, err.message);
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
                
                // Pre-fetch authTime to detect stale cache later
                firebaseUser.getIdTokenResult().then(token => {
                    if (isMounted) authTimeRef.current = new Date(token.authTime).getTime();
                }).catch(e => console.warn('[AuthContext] Failed to pre-fetch authTime:', e));
                
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

                    setOnboardingCompleted(data.onboardingCompleted ?? null);
                    setWelcomeSeen(data.welcomeSeen ?? false);
                    setTeaserCompleted(data.teaserCompleted ?? false);
                    setTeaserLock(data.teaserLock || null);
                    setGameCoins(data.gameCoins ?? 0);
                    const status = data.accountStatus || (data.isRevoked ? 'revoked' : 'active');

                    setAccountStatus(status);
                    setRelationshipId(data.relationshipId || null);
                    if (data.relationshipId) {
                        localStorage.setItem('capsule_relationship_id', data.relationshipId);
                    }

                    // AUTO-SIGN-OUT: If access is revoked, kill session immediately
                    // STALE CACHE PROTECTION: Ignore 'revoked' status if it comes from the cache 
                    // and was updated BEFORE the current session started (authTime).
                    if (data.accountStatus === 'revoked') {
                        const docUpdatedAt = data.updatedAt?.toMillis?.() || 0;
                        const sessionAuthTime = authTimeRef.current || 0;

                        if (snapshot.metadata.fromCache && sessionAuthTime > docUpdatedAt) {
                            console.log('[AuthContext] Ignoring stale revoked status from cache.');
                            return;
                        }

                        // If NOT from cache, or if it's a recent revocation, enforce it.
                        if (!snapshot.metadata.fromCache) {
                            console.warn('[AuthContext] Access revoked by server. Signing out.');
                            authSignOut();
                            toast.error('Tu acceso ha sido desactivado.');
                            setIsLoading(false);
                            return;
                        }
                    }
                    
                    // Defensive: If role is ADMIN, they shouldn't be blocked by teaser/welcome flags
                    // Fallback: If role is not in claims, take it from Firestore
                    if (data.role) {
                        setRole(data.role);
                    }
                }, (err) => {
                    // SILENT RETRY: onSnapshot errors (e.g. temporary connectivity loss or token refresh delay)
                    if (err.code === 'permission-denied') {
                        console.warn('[AuthContext] Snapshot permission denied. Retrying soon...');
                        // Don't sign out! The user might still be authenticating or claims might be propagating.
                    } else {
                        console.error('[AuthContext] Snapshot error:', err.code, err.message);
                    }
                });

                // 2. Obtener claims (sin forzar refresh, mucho más rápido)
                getCurrentUserClaims(false).then(async (claims) => {
                    if (!isMounted) return;
                    
                    setUser(firebaseUser);
                    // No exponemos el rol ni el ID de relación hasta que estemos seguros de los claims
                    // setRole(claims.role); // <- Movido abajo
                    // setRelationshipId(claims.relationshipId); // <- Movido abajo

                    console.log(`[AuthContext] User UID: ${firebaseUser.uid}`);
                    console.log(`[AuthContext] Current Claims:`, JSON.stringify(claims));

                    // --- REPAIR & SYNC LOGIC (HARDENED SELF-HEALING) ---
                    // REFUERZO: Si es ADMIN, forzamos refresco una vez si falta el ID de relación.
                    if (firebaseUser && claims.role === ROLES.ADMIN && !claims.relationshipId) {
                        console.log('[AuthContext] Admin session possibly stale. Forcing total cleanse...');
                        try {
                            const refreshResult = await firebaseUser.getIdTokenResult(true);
                            console.log('[AuthContext] Refresh complete. New claims:', JSON.stringify(refreshResult.claims));
                            setRole(refreshResult.claims.role);
                            setRelationshipId(refreshResult.claims.relationshipId);
                        } catch (err) {
                            console.error('[AuthContext] Forced refresh failed:', err);
                        }
                    }

                    // Si incluso tras posible refresco faltan los permisos críticos 
                    // (rol o ID de relación), forzamos la reparación ANTES de soltar el loader.
                    if (firebaseUser && (!claims.role || !claims.relationshipId)) {
                        console.log('[AuthContext] Claims incomplete (role or relId). Hard-healing session...');
                        try {
                            const repairResult = await callRepairAuth();
                            if (repairResult.success) {
                                console.log('[AuthContext] Claims repaired on backend. Forcing token refresh...');
                                // Forzar refresh del token JWT para descartar el antiguo y traer los nuevos claims
                                const refreshedTokenResult = await firebaseUser.getIdTokenResult(true);
                                const newClaims = refreshedTokenResult.claims;
                                
                                setRole(newClaims.role);
                                setRelationshipId(newClaims.relationshipId);
                                if (newClaims.relationshipId) {
                                    localStorage.setItem('capsule_relationship_id', newClaims.relationshipId);
                                }
                                toast.success('Accesos restaurados.');
                            }
                        } catch (repairErr) {
                            console.error('[AuthContext] Hard-healing failed:', repairErr);
                            // Fallback: si la reparación falla críticamente (perfil borrado), deslogueamos
                            // para evitar bucles infinitos de carga o errores 403 persistentes.
                            if (repairErr.code === 'not-found' || repairErr.code === 'failed-precondition') {
                                console.error('[AuthContext] User profile broken. Forcing sign out.');
                                authSignOut();
                            }
                        }
                    }

                    if (claims.relationshipId) {
                        localStorage.setItem('capsule_relationship_id', claims.relationshipId);
                    }
                    setDeviceId(claims.deviceId);

                    // --- SOLTAR DATOS ---
                    // Solo una vez que los claims han sido verificados (o reparados), 
                    // actualizamos los estados que disparan el resto de la app.
                    setRole(claims.role);
                    setRelationshipId(claims.relationshipId);

                    // Register FCM
                    if (claims.role === ROLES.PARTNER || claims.role === ROLES.ADMIN) {
                        registerFCM(firebaseUser.uid);
                    }

                    // --- FOREGROUND MESSAGING ---
                    // This handles notifications when the app is OPEN
                    if (import.meta.env.VITE_USE_EMULATORS !== 'true') {
                        try {
                            const { isSupported, onMessage } = await import('firebase/messaging');
                            if (await isSupported()) {
                                const { messaging } = await import('../services/firebase');
                                if (messaging) {
                                    unsubscribeMessaging = onMessage(messaging, (payload) => {
                                        console.log('[AuthContext] Foreground message received:', payload);
                                        toast.info(
                                            payload.notification?.title || '📸 ¡Nueva Instantánea!', 
                                            payload.notification?.body || 'Tu pareja ha capturado un momento.',
                                            { duration: 6000 }
                                        );
                                    });
                                }
                            }
                        } catch (msgErr) {
                            console.warn('[AuthContext] Failed to setup foreground messaging:', msgErr);
                        }
                    }
                }).catch((err) => {
                    console.error('[AuthContext] Claims critical error:', err);
                }).finally(() => {
                    // Solo soltamos el loader una vez que los claims (y la posible reparación) terminen.
                    if (isMounted) setIsLoading(false);
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
                    
                    // Only stop loading if this is a confirmed final null state
                    // We add a tiny delay to avoid flashing /join during hot module replacement or quick link clicks
                    if (!initialAuthChecked.current) {
                        initialAuthChecked.current = true;
                        setTimeout(() => {
                            if (isMounted && !auth.currentUser) {
                                setIsLoading(false);
                            }
                        }, 500);
                    } else {
                        setIsLoading(false);
                        localStorage.removeItem('capsule_relationship_id');
                    }
                }
            }
        });


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
                // FORCE RESET: Sign out any existing session before starting the new one
                // to ensure a clean state and fresh onAuthStateChanged trigger.
                await auth.signOut();
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

    const completeWelcome = useCallback(async (name) => {
        if (!user?.uid || !relationshipId) return;
        // Optimistic update
        setWelcomeSeen(true);
        try {
            const batch = writeBatch(db);
            
            // 1. Mark welcome as seen on user doc
            const userRef = doc(db, COLLECTIONS.USERS, user.uid);
            batch.update(userRef, { 
                welcomeSeen: true,
                displayName: name || (role === ROLES.ADMIN ? 'Admin' : 'Pareja')
            });

            // 2. Update centralized names config
            const namesRef = doc(db, COLLECTIONS.RELATIONSHIPS, relationshipId, 'config', 'names');
            const field = role === ROLES.ADMIN ? 'admin' : 'partner';
            
            batch.set(namesRef, {
                [field]: name || (role === ROLES.ADMIN ? 'Admin' : 'Pareja'),
                updatedAt: new Date()
            }, { merge: true });

            await batch.commit();
        } catch (err) {
            console.error("Error updating welcome:", err);
            // setWelcomeSeen(false);
            throw err;
        }
    }, [user?.uid, relationshipId, role]);

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
