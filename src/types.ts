export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Chat {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  createdAt: number;
  personalizationEnabled?: boolean;
}

export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface RunningModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details?: any;
}

export interface Canvas {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  chatId: string | null; // null if detached from chat
}

export interface OllamaStatus {
  connected: boolean;
  url: string;
  error?: string;
}

