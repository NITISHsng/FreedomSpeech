'use client';

import { useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';

export function useAnonymousUser() {
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
      const { data } = await supabase
        .from('profiles')
        .select('username, password')
        .eq('id', id)
        .maybeSingle();
      
      if (data) {
        if (!data.username) {
          const newName = generateRandomName();
          await supabase.from('profiles').update({ username: newName }).eq('id', id);
          setProfile({ username: newName, password_set: !!data.password });
        } else {
          setProfile({
            username: data.username,
            password_set: !!data.password
          });
        }
      } else {
        // Auto-register if ID exists in local but not in DB
        const newName = generateRandomName();
        await supabase.from('profiles').insert({ id, username: newName });
        setProfile({ username: newName, password_set: false });
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  }, [generateRandomName]);

  const reclaimGhost = useCallback(async (id: string, password?: string) => {
    setIsLoaded(false);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, password, username')
        .eq('id', id.trim())
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Ghost ID not found in the registry.");

      // If a password is set, it must match
      if (data.password && data.password !== password?.trim()) {
        throw new Error("Invalid password for this Ghost ID.");
      }

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
      console.error("Reclaim error:", err);
      setIsLoaded(true);
      throw err;
    }
  }, []);

  const registerGhost = useCallback(async (customId?: string) => {
    const idToRegister = customId || localStorage.getItem('freedom_user_id') || getTimestampedId();
    const defaultUsername = generateRandomName();
    
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, username, password')
        .eq('id', idToRegister)
        .maybeSingle();

      if (existing) {
        localStorage.setItem('freedom_user_id', idToRegister);
        setUserId(idToRegister);
        
        if (!existing.username) {
          await supabase.from('profiles').update({ username: defaultUsername }).eq('id', idToRegister);
          setProfile({ username: defaultUsername, password_set: !!existing.password });
        } else {
          setProfile({ username: existing.username, password_set: !!existing.password });
        }
        setIsLoaded(true);
        return idToRegister;
      }

      const { error } = await supabase.from('profiles').insert({ id: idToRegister, username: defaultUsername });

      if (!error) {
        localStorage.setItem('freedom_user_id', idToRegister);
        setUserId(idToRegister);
        setProfile({ username: defaultUsername, password_set: false });
        setIsLoaded(true);
        return idToRegister;
      } else {
        throw error;
      }
    } catch (err) {
      console.error("Registration error:", err);
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
      } else {
        await registerGhost();
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
