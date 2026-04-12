'use client';

import { useAnonymousUser } from "@/hooks/useAnonymousUser";
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationInitializer() {
  const { userId } = useAnonymousUser();
  useNotifications(userId);
  return null;
}
