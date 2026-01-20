
export interface GameRecord {
  id?: string;
  player_name: string;
  attempts: number;
  time_seconds: number;
  created_at?: string;
}

export interface GuessEntry {
  number: number;
  feedback: 'High' | 'Low' | 'Correct';
  timestamp: number;
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  WON = 'WON'
}
