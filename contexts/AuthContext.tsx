import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '../types';
import { signInWithGoogle as apiSignIn, signOut as apiSignOut, checkInitialAuthState } from '../services/googleAuthService';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for a logged-in user in local storage on initial load
        const initialUser = checkInitialAuthState();
        if (initialUser) {
            setUser(initialUser);
        }
        setIsLoading(false);
    }, []);

    const signIn = async () => {
        setIsLoading(true);
        try {
            const loggedInUser = await apiSignIn();
            setUser(loggedInUser);
        } catch (error) {
            console.error("Sign in failed:", error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        await apiSignOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
