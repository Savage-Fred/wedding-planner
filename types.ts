export type MessageSource = 'email' | 'instagram';
export type Urgency = 'urgent' | 'high' | 'medium' | 'low';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type Category = 'Vendor' | 'Guest RSVP' | 'Venue' | 'Logistics' | 'Personal' | 'Other';
export type GuestStatus = 'Attending' | 'Declined' | 'Pending';
export type View = 'dashboard' | 'communications' | 'guests' | 'tasks' | 'calendar' | 'settings';

export interface Communication {
  id: string;
  from: string;
  subject: string;
  body: string;
  date: string;
  source: MessageSource;
}

export interface AnalysisResult {
  summary: string;
  urgency: Urgency;
  sentiment: Sentiment;
  category: Category;
  tasks: {
    description: string;
    dueDate?: string;
  }[];
  guestUpdate: {
    name: string;
    status: GuestStatus;
    partySize: number;
  } | null;
}

export interface AnalyzedMessage {
  communication: Communication;
  analysis: AnalysisResult;
}

export interface Guest {
  id: string;
  name: string;
  status: GuestStatus;
  partySize: number;
  contact?: string;
  mealPreference?: 'Not Specified' | 'Chicken' | 'Fish' | 'Vegetarian';
  category?: string;
  notes: string;
}

export interface Task {
  id: string;
  description: string;
  completed: boolean;
  sourceMessageId: string;
  dueDate?: string;
}

export interface WeddingEvent {
    id: string;
    title: string;
    start: string; // ISO String
    end: string;   // ISO String
    description: string;
}

export interface User {
  name: string;
  email: string;
  avatarUrl: string;
}
