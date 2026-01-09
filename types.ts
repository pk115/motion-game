export enum GameState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
}

export interface SquatData {
  count: number;
  isSquatting: boolean;
  kneeAngle: number;
  confidence: number;
}

export interface CoachMessage {
  text: string;
  type: 'motivation' | 'tip' | 'congrats';
}

export interface User {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  location?: {
    province: string;
    country: string;
    continent: string;
  };
  totalScore?: number;
  maxEndurance?: number;
}

export interface ScoreEntry {
  uid: string;
  displayName: string;
  photoURL: string | null;
  score: number;
  gameId: string; // 'climber', 'mosquito', 'train', etc.
  location: string; // The specific location value for this leaderboard (e.g. "Bangkok", "Thailand")
  timestamp: any; // Firestore Timestamp
}

export type LeaderboardLevel = 'province' | 'country' | 'continent' | 'world';
export type LeaderboardCategory = 'cumulative' | 'endurance';
