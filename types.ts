
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

export type SessionState = 'idle' | 'connecting' | 'connected' | 'error';
