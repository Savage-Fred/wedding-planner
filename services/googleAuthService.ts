import { User } from '../types';

declare global {
  interface Window {
    google: any;
  }
}

const decodeJwtResponse = (token: string): any => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error decoding JWT", e);
        return null;
    }
};

export const initializeGsi = (handleCredentialResponse: (response: any) => void) => {
    let clientId = process.env.GOOGLE_CLIENT_ID;
    if (!window.google) {
        console.error('Google GSI script not loaded.');
        return false;
    }
    if (!clientId) {
        console.warn("GOOGLE_CLIENT_ID is not set. Using a placeholder for preview purposes. Google Sign-In will not function but the button will render for UI demonstration.");
        clientId = 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com'; // A valid-looking placeholder to prevent GSI library errors on init
    }

    window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
    });
    return true;
};

export const renderGoogleButton = (element: HTMLElement) => {
   if (!window.google) return;
   window.google.accounts.id.renderButton(element, { 
       theme: 'outline', 
       size: 'large', 
       type: 'standard', 
       text: 'signin_with',
       width: '300'
   });
};

export const promptOneTap = () => {
    if (!window.google) return;
    window.google.accounts.id.prompt();
};

export const createClaraUserFromGoogle = (gsiPayload: any): User | null => {
    if (!gsiPayload) return null;
    return {
        name: gsiPayload.name,
        email: gsiPayload.email,
        avatarUrl: gsiPayload.picture,
    };
};

export const signOutFromGoogle = () => {
    if (!window.google) return;
    window.google.accounts.id.disableAutoSelect();
};


export const signOut = async (): Promise<void> => {
    signOutFromGoogle();
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
            localStorage.removeItem('wedding_planner_user');
            return null;
        }
    }
    return null;
};

export { decodeJwtResponse };