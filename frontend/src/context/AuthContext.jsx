import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getToken, onMessage } from 'firebase/messaging';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { auth, messaging, db } from '../services/firebase';
import firebaseConfig from '../config/firebase';
import {
    getCurrentUserClaims,
    signOut as authSignOut,
} from '../services/auth';
import { ROLES, COLLECTIONS } from '../config/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [deviceId, setDeviceId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Register FCM Token for partners
    const registerFCM = useCallback(async (userId) => {
        if (!messaging) return;
        try {
            const token = await getToken(messaging, {
                vapidKey: firebaseConfig.vapidKey
            });
            if (token) {
                const userRef = doc(db, COLLECTIONS.USERS, userId);
                await updateDoc(userRef, {
                    fcmTokens: arrayUnion(token)
                });
            }
        } catch (err) {
            console.error('FCM Registration failed:', err);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                let claims = { role: null, deviceId: null };
                try {
                    claims = await getCurrentUserClaims(true);
                } catch { /* session error */ }

                setUser(firebaseUser);
                setRole(claims.role);
                setDeviceId(claims.deviceId);

                // If partner, try registering FCM
                if (claims.role === ROLES.PARTNER) {
                    registerFCM(firebaseUser.uid);
                }
            } else {
                setUser(null);
                setRole(null);
                setDeviceId(null);
            }
            setIsLoading(false);
        });

        // Listen for foreground messages
        let unsubscribeMessaging = () => { };
        if (messaging) {
            unsubscribeMessaging = onMessage(messaging, (payload) => {
                console.log('Message received in foreground: ', payload);
                // Trigger global toast or similar
            });
        }

        return () => {
            unsubscribe();
            unsubscribeMessaging();
        };
    }, [registerFCM]);

    const signOut = useCallback(() => authSignOut(), []);

    const value = useMemo(() => ({
        user,
        role,
        deviceId,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: role === ROLES.ADMIN,
        isPartner: role === ROLES.PARTNER,
        signOut,
    }), [user, role, deviceId, isLoading, signOut]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
