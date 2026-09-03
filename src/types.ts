export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export type AIMode = 'reflect' | 'summarize' | 'brainstorm' | 'deep_dive' | 'chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  mode?: AIMode;
}

export interface PlaceSuggestion {
  placeId: string;
  name: string;
  description: string;
  mainText: string;
  secondaryText?: string;
}

export interface EntryLocation {
  placeName: string;
  placeId?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface ReflectionEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  mood?: string;
  sentimentScore?: number; // 1-5 numeric scale (1=Very Negative/Heavy, 3=Neutral/Balanced, 5=Very Positive/Joyful)
  sentimentLabel?: string; // 'Positive' | 'Neutral' | 'Negative' | 'Very Positive' | 'Very Negative'
  sentimentReasoning?: string; // 1-sentence explanation of mood analysis
  location?: EntryLocation; // Optional opt-in geolocation metadata
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface AIResponsePayload {
  reply: string;
  modelUsed: string;
  summary?: string;
  tags?: string[];
  suggestedTags?: string[];
  brainstormQuestions?: string[];
  sentimentScore?: number;
  sentimentLabel?: string;
  sentimentReasoning?: string;
}
