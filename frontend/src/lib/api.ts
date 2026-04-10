/**
 * Generic API utility pointing to the Express backend.
 * Provides a base foundation for decoupling from Supabase directly in the future.
 */

import { io } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Global Socket Instance with explicit websocket transport for Render compatibility
export const socket = io(API_URL, {
  transports: ['websocket'],
  reconnectionAttempts: 5,
});

export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
    }

    // Attempt to return JSON if possible
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    throw error;
  }
};
