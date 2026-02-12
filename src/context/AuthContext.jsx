import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';

const AuthContext = createContext(null);

/**
 * Authentication provider — wraps the app and provides auth state.
 * 
 * Usage:
 *   const { user, isLoading, isAdmin } = useAuth();
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setIsLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = useMemo(() => ({
        user,
        isLoading,
        isAuthenticated: !!user,
        // Admin check via custom claims
        isAdmin: user?.customClaims?.admin === true || false,
    }), [user, isLoading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to access auth state
 * @returns {{ user: object|null, isLoading: boolean, isAuthenticated: boolean, isAdmin: boolean }}
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
