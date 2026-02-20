import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import {
    getCurrentUserClaims,
    updateLastActiveAt,
    signOut as authSignOut,
} from '../services/auth';
import { ROLES } from '../config/constants';

const AuthContext = createContext(null);

/**
 * Authentication provider — wraps the app and provides auth state.
 *
 * Exposes:
 *   user          — Firebase Auth user object (or null)
 *   role          — "admin" | "partner" | null
 *   deviceId      — Device fingerprint from custom claims (partner only)
 *   isLoading     — true while resolving auth state on first load
 *   isAuthenticated
 *   isAdmin
 *   isPartner
 *   signOut()
 *
 * Usage:
 *   const { user, role, isAdmin, isPartner, isLoading } = useAuth();
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [deviceId, setDeviceId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Resolve custom claims (role + deviceId)
                const claims = await getCurrentUserClaims();
                setUser(firebaseUser);
                setRole(claims.role);
                setDeviceId(claims.deviceId);

                // Update last active timestamp — fire and forget
                updateLastActiveAt(firebaseUser.uid);
            } else {
                setUser(null);
                setRole(null);
                setDeviceId(null);
            }
            setIsLoading(false);
        });

        return unsubscribe;
    }, []);

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

/**
 * Hook to access auth state
 * @returns {{ user, role, deviceId, isLoading, isAuthenticated, isAdmin, isPartner, signOut }}
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
