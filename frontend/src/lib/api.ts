import axios, { AxiosResponse } from 'axios';
import {
  ApiResponse,
  User,
  Contact,
  ContactsResponse,
  MessagesResponse,
  BulkMessage,
  SpamAnalysis,
  WhatsAppConnection,
  Statistics,
  ContactFormData,
  BulkMessageFormData
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
console.log("API_BASE_URL", API_BASE_URL);
// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (userData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getCurrentUser: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (profileData: {
    name?: string;
    phone?: string;
  }): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },
};

// WhatsApp API
export const whatsappApi = {
  connect: async (): Promise<ApiResponse<{ qr?: string; isConnected: boolean }>> => {
    const response = await api.post('/whatsapp/connect');
    return response.data;
  },

  getStatus: async (): Promise<ApiResponse<WhatsAppConnection>> => {
    const response = await api.get('/whatsapp/status');
    return response.data;
  },

  getQR: async (): Promise<ApiResponse<{ qr: string; isConnected: boolean }>> => {
    const response = await api.get('/whatsapp/qr');
    return response.data;
  },

  disconnect: async (): Promise<ApiResponse> => {
    const response = await api.post('/whatsapp/disconnect');
    return response.data;
  },

  sendTestMessage: async (data: {
    phoneNumber: string;
    message: string;
  }): Promise<ApiResponse<{ messageId: string }>> => {
    const response = await api.post('/whatsapp/test-message', data);
    return response.data;
  },
};

// Contacts API
export const contactsApi = {
  getContacts: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string;
  }): Promise<ApiResponse<ContactsResponse>> => {
    const response = await api.get('/contacts', { params });
    return response.data;
  },

  addContact: async (contactData: ContactFormData): Promise<ApiResponse<{ contact: Contact }>> => {
    const response = await api.post('/contacts', contactData);
    return response.data;
  },

  updateContact: async (id: string, contactData: ContactFormData): Promise<ApiResponse<{ contact: Contact }>> => {
    const response = await api.put(`/contacts/${id}`, contactData);
    return response.data;
  },

  deleteContact: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/contacts/${id}`);
    return response.data;
  },

  uploadContacts: async (file: File): Promise<ApiResponse<{
    totalProcessed: number;
    successCount: number;
    errorCount: number;
    contacts: Contact[];
    errors: Array<{ row: number; error: string }>;
  }>> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/contacts/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

};

// Messages API
export const messagesApi = {
  analyzeMessage: async (data: {
    message: string;
    category: string;
  }): Promise<ApiResponse<SpamAnalysis>> => {
    const response = await api.post('/messages/analyze', data);
    return response.data;
  },

  sendBulkMessage: async (data: BulkMessageFormData): Promise<ApiResponse<{
    bulkMessageId: string;
    totalContacts: number;
    status: string;
    analysis: {
      isSpam: boolean;
      spamWords: string[];
      replacements: Array<{ original: string; replacement: string; reason: string }>;
    };
  }>> => {
    const response = await api.post('/messages/send-bulk', data);
    return response.data;
  },

  getBulkMessageStatus: async (id: string): Promise<ApiResponse<{ bulkMessage: BulkMessage }>> => {
    const response = await api.get(`/messages/bulk/${id}/status`);
    return response.data;
  },

  getBulkMessages: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<{ bulkMessages: BulkMessage[]; total: number }>> => {
    const response = await api.get('/messages/bulk', { params });
    return response.data;
  },

  getBulkMessageDetails: async (id: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    messages: Array<{
      id: string;
      contact: Contact;
      status: string;
      sentAt?: string;
      deliveredAt?: string;
      readAt?: string;
      errorMessage?: string;
      retryCount: number;
    }>;
    pagination: any;
  }>> => {
    const response = await api.get(`/messages/bulk/${id}/details`, { params });
    return response.data;
  },

  getMessageHistory: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<MessagesResponse>> => {
    const response = await api.get('/messages/history', { params });
    return response.data;
  },

  getStatistics: async (period?: string): Promise<ApiResponse<Statistics>> => {
    const response = await api.get('/messages/statistics', {
      params: period ? { period } : {}
    });
    return response.data;
  },
};

// Settings API
export const settingsApi = {
  getSettings: async (): Promise<ApiResponse<any>> => {
    const response = await api.get('/settings');
    return response.data;
  },

  updateSettings: async (settings: any): Promise<ApiResponse<any>> => {
    const response = await api.put('/settings', settings);
    return response.data;
  },

  resetSettings: async (): Promise<ApiResponse<any>> => {
    const response = await api.post('/settings/reset');
    return response.data;
  },
};

export default api;
