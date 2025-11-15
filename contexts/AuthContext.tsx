
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '../types';
import { checkInitialAuthState, signOut as apiSignOut, decodeJwtResponse, createClaraUserFromGoogle } from '../services/googleAuthService';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    handleSignIn: (response: any) => void;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initialUser = checkInitialAuthState();
        if (initialUser) {
            setUser(initialUser);
        }
        setIsLoading(false);
    }, []);

    const handleSignIn = (gsiResponse: any) => {
        setIsLoading(true);
        try {
            const payload = decodeJwtResponse(gsiResponse.credential);
            const claraUser = createClaraUserFromGoogle(payload);
            if(claraUser) {
                localStorage.setItem('wedding_planner_user', JSON.stringify(claraUser));
                setUser(claraUser);
            } else {
                 throw new Error("Could not create user from Google response");
            }
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
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, handleSignIn, signOut }}>
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
