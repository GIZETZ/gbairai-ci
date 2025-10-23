
import React, { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  unreadCount: number;
  onClick?: () => void;
  className?: string;
}

export function NotificationBadge({ unreadCount, onClick, className }: NotificationBadgeProps) {
  // Mettre à jour le badge de l'app
  useEffect(() => {
    if ('setAppBadge' in navigator && unreadCount > 0) {
      (navigator as any).setAppBadge(unreadCount);
    } else if ('clearAppBadge' in navigator && unreadCount === 0) {
      (navigator as any).clearAppBadge();
    }

    // Aussi envoyer au service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_BADGE',
        count: unreadCount
      });
    }
  }, [unreadCount]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn("relative", className)}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  );
}

// Hook pour gérer les notifications
export function useNotifications() {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  // Persistance locale du compteur
  useEffect(() => {
    const stored = localStorage.getItem('gbairai_unread_count');
    if (stored) {
      setUnreadCount(parseInt(stored, 10));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gbairai_unread_count', unreadCount.toString());
  }, [unreadCount]);

  // Détection online/offline
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Demander permission notifications
  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  // Afficher notification locale
  const showNotification = (title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        ...options
      });
    }
  };

  return {
    unreadCount,
    setUnreadCount,
    isOnline,
    requestPermission,
    showNotification
  };
}
