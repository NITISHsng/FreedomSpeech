'use client';

import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';
import { fetchAPI } from '@/lib/api';

export function useNotifications(userId: string | null) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const requestPermission = async () => {
      if (!userId || !messaging) {
        return;
      }

      try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          });

          if (currentToken) {
            setToken(currentToken);
            // Save token to profile via backend
            await fetchAPI('/api/profiles', {
              method: 'POST',
              body: JSON.stringify({
                id: userId,
                fcm_token: currentToken
              })
            });
          }
        }
      } catch (err) {
        console.error('Notification permission error:', err);
      }
    };

    requestPermission();

    if (messaging) {
        const unsubscribe = onMessage(messaging, (payload) => {
            if (payload.notification) {
              new Notification(payload.notification.title || 'New Message', {
                  body: payload.notification.body,
              });
            }
        });
        return () => unsubscribe();
    }
  }, [userId]);

  return { token };
}
