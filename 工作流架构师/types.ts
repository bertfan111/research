export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
}

export interface AutomationCandidate {
  id: string;
  title: string;
  description: string;
  frequency: string;
  estimatedTimeSaved: string;
  complexity: 'Low' | 'Medium' | 'High';
  steps: string[];
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface LiveConfig {
  voiceName: string;
}
