import { User } from '../types';

// Mock implementation of Google Authentication
// In a real app, this would use the Google Identity Services library (gapi/gis)

export const signInWithGoogle = async (): Promise<User> => {
    console.log("Simulating Google Sign-In...");
    return new Promise(resolve => {
        setTimeout(() => {
            const mockUser: User = {
                name: 'Alex Doe',
                email: 'alex.doe@example.com',
                avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=Alex%20Doe`,
            };
            // In a real app, you'd store the token securely.
            // Here, we'll just simulate it by storing the user object in localStorage.
            localStorage.setItem('wedding_planner_user', JSON.stringify(mockUser));
            console.log("Sign-In successful:", mockUser);
            resolve(mockUser);
        }, 1000);
    });
};

export const signOut = async (): Promise<void> => {
    console.log("Simulating Sign-Out...");
    localStorage.removeItem('wedding_planner_user');
    return Promise.resolve();
};

export const checkInitialAuthState = (): User | null => {
    const storedUser = localStorage.getItem('wedding_planner_user');
    if (storedUser) {
        try {
            return JSON.parse(storedUser) as User;
        } catch (e) {
            console.error("Failed to parse stored user:", e);
            return null;
        }
    }
    return null;
};
