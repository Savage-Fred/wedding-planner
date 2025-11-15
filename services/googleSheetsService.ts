import { Guest } from '../types';

// Mock data to simulate the content of the Google Sheet
const MOCK_SHEET_DATA: Guest[] = [
    { id: 'g1', name: 'Susan & Bob Smith', status: 'Attending', partySize: 2, contact: 'susan@example.com', mealPreference: 'Chicken', category: "Bride's Family", notes: 'Coming from out of town.' },
    { id: 'g2', name: 'Mike Johnson', status: 'Declined', partySize: 1, contact: 'mike@example.com', mealPreference: 'Not Specified', category: "Groom's Friend", notes: 'Has a work conflict, sends his regrets.' },
    { id: 'g3', name: 'Jessica Bloom & Guest', status: 'Pending', partySize: 2, contact: 'jess@example.com', mealPreference: 'Vegetarian', category: "Bride's Friend", notes: 'Asked about hotel block information.' },
    { id: 'g4', name: 'The Davis Family', status: 'Attending', partySize: 4, contact: 'davis@example.com', mealPreference: 'Not Specified', category: "Groom's Family", notes: 'Need 2 high chairs.' },
    { id: 'g5', name: 'Charles Green', status: 'Pending', partySize: 1, contact: 'charles@example.com', mealPreference: 'Fish', category: "Work Colleague", notes: '' },
];

let guestList: Guest[] = [...MOCK_SHEET_DATA];

// Mock implementation of Google Sheets API interaction
// A real implementation would use the Google Sheets API client library and require OAuth scopes.
const simulateApiDelay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

export const setSheetUrl = (url: string): boolean => {
    // Basic validation
    if (url.startsWith('https://docs.google.com/spreadsheets/d/')) {
        localStorage.setItem('google_sheet_url', url);
        console.log(`Google Sheet URL configured: ${url}`);
        // Here, a real app might try to fetch sheet metadata to verify permissions
        return true;
    }
    return false;
}

export const getSheetUrl = (): string | null => {
    return localStorage.getItem('google_sheet_url');
}

export const getGuests = async (): Promise<Guest[]> => {
    console.log(`Fetching guests from mock Google Sheet...`);
    // In a real app, this would make an API call to Google Sheets.
    // We simulate checking if the user has permission (by checking if URL is set).
    if (!getSheetUrl()) {
        throw new Error("Google Sheet URL not configured. Please set it in Settings.");
    }
    await simulateApiDelay();
    console.log("Fetched guests:", guestList);
    return [...guestList];
};

export const addGuest = async (guestData: Omit<Guest, 'id'>): Promise<Guest> => {
    console.log(`Adding guest to mock Google Sheet...`, guestData);
    if (!getSheetUrl()) throw new Error("Google Sheet URL not configured.");
    
    await simulateApiDelay(800);
    const newGuest: Guest = { ...guestData, id: `g_${Date.now()}` };
    guestList.push(newGuest);
    console.log("Guest added:", newGuest);
    return newGuest;
};

export const updateGuest = async (guestData: Guest): Promise<Guest> => {
    console.log(`Updating guest in mock Google Sheet...`, guestData);
    if (!getSheetUrl()) throw new Error("Google Sheet URL not configured.");
    
    await simulateApiDelay(800);
    const index = guestList.findIndex(g => g.id === guestData.id);
    if (index === -1) {
        throw new Error("Guest not found");
    }
    guestList[index] = guestData;
    console.log("Guest updated:", guestData);
    return guestData;
};

export const deleteGuest = async (guestId: string): Promise<void> => {
    console.log(`Deleting guest from mock Google Sheet with id: ${guestId}`);
    if (!getSheetUrl()) throw new Error("Google Sheet URL not configured.");
    
    await simulateApiDelay(800);
    const initialLength = guestList.length;
    guestList = guestList.filter(g => g.id !== guestId);
    if (guestList.length === initialLength) {
        throw new Error("Guest not found for deletion");
    }
    console.log("Guest deleted successfully.");
};

export const batchAddGuests = async (guestsData: Omit<Guest, 'id'>[]): Promise<Guest[]> => {
    console.log(`Batch adding ${guestsData.length} guests to mock Google Sheet...`);
    if (!getSheetUrl()) throw new Error("Google Sheet URL not configured.");
    
    await simulateApiDelay(1500); // Simulate longer delay for batch operation
    const newGuests: Guest[] = guestsData.map(guest => ({
        ...guest,
        id: `g_${Date.now()}_${Math.random()}`
    }));
    guestList.push(...newGuests);
    console.log("Guests added:", newGuests);
    return newGuests;
};