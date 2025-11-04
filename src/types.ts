export enum Speaker {
  User = 'User',
  Model = 'Model',
}

export interface TranscriptEntry {
  id: number;
  speaker: Speaker;
  text: string;
  isFinal: boolean;
}

export type User = {
  id: string;
  username: string;
};

export type Badge = {
  id: string;
  scenario_id: string;
  name: string;
  image_url: string;
};

export type UserBadge ={
  id: string;
  user_id: string;
  badge_id: string;
  archived_at: string;
}

export type SessionState = 'idle' | 'connecting' | 'connected' | 'error';
