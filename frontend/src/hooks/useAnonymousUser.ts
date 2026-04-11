'use client';

import { useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { fetchAPI } from '@/lib/api';

export function useAnonymousUser(options: { autoRegister?: boolean } = { autoRegister: true }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [profile, setProfile] = useState<{ username: string; password_set: boolean } | null>(null);

  const generateRandomName = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }, []);

  const getTimestampedId = useCallback(() => {
    return `${uuidv4()}-${Date.now()}`;
  }, []);

  const fetchProfile = useCallback(async (id: string) => {
    try {
      const data = await fetchAPI(`/api/profiles/${id}`);
      
      if (data) {
        if (!data.username) {
          const newName = generateRandomName();
          await fetchAPI('/api/profiles', {
            method: 'POST',
            body: JSON.stringify({ id, username: newName })
          });
          setProfile({ username: newName, password_set: !!data.password });
        } else {
          setProfile({
            username: data.username,
            password_set: !!data.password
          });
        }
      } else {
        // Auto-register via backend
        const newName = generateRandomName();
        await fetchAPI('/api/profiles', {
            method: 'POST',
            body: JSON.stringify({ id, username: newName })
        });
        setProfile({ username: newName, password_set: false });
      }
    } catch (err) {
      console.error("Profile fetch error via API:", err);
    }
  }, [generateRandomName]);

  const reclaimGhost = useCallback(async (id: string, password?: string) => {
    setIsLoaded(false);
    try {
      const data = await fetchAPI('/api/profiles/reclaim', {
        method: 'POST',
        body: JSON.stringify({ id, password })
      });

      // Success - persist to new browser
      localStorage.setItem('freedom_user_id', data.id);
      setUserId(data.id);
      setProfile({
        username: data.username || "Ghost",
        password_set: !!data.password
      });
      setIsLoaded(true);
      return data;
    } catch (err: any) {
      console.error("Reclaim error via API:", err);
      setIsLoaded(true);
      throw err;
    }
  }, []);

  const registerGhost = useCallback(async (customId?: string) => {
    const idToRegister = customId || localStorage.getItem('freedom_user_id') || getTimestampedId();
    const defaultUsername = generateRandomName();
    
    try {
      const existing = await fetchAPI(`/api/profiles/${idToRegister}`).catch(() => null);

      if (existing) {
        localStorage.setItem('freedom_user_id', idToRegister);
        setUserId(idToRegister);
        
        if (!existing.username) {
          await fetchAPI('/api/profiles', {
            method: 'POST',
            body: JSON.stringify({ id: idToRegister, username: defaultUsername })
          });
          setProfile({ username: defaultUsername, password_set: !!existing.password });
        } else {
          setProfile({ username: existing.username, password_set: !!existing.password });
        }
        setIsLoaded(true);
        return idToRegister;
      }

      await fetchAPI('/api/profiles', {
        method: 'POST',
        body: JSON.stringify({ id: idToRegister, username: defaultUsername })
      });

      localStorage.setItem('freedom_user_id', idToRegister);
      setUserId(idToRegister);
      setProfile({ username: defaultUsername, password_set: false });
      setIsLoaded(true);
      return idToRegister;
    } catch (err) {
      console.error("Registration error via API:", err);
      setIsLoaded(true); 
    }
  }, [generateRandomName, getTimestampedId]);

  useEffect(() => {
    const initIdentity = async () => {
      const storedId = localStorage.getItem('freedom_user_id');
      if (storedId) {
        setUserId(storedId);
        await fetchProfile(storedId);
        setIsLoaded(true);
      } else if (options.autoRegister !== false) {
        await registerGhost();
      } else {
        setIsLoaded(true);
      }
    };

    initIdentity();
  }, [fetchProfile, registerGhost]);

  return {
    userId,
    isLoaded,
    profile,
    registerGhost,
    reclaimGhost,
    getTimestampedId,
    refreshProfile: () => userId && fetchProfile(userId)
  };
}
