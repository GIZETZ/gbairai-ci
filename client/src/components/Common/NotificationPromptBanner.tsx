import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { requestNotificationPermission, subscribeToPushNotifications } from '@/serviceWorkerRegistration';

const LS_KEY_DISMISSED = 'gbairai_push_prompt_dismissed';

export default function NotificationPromptBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(LS_KEY_DISMISSED) === '1';
    const shouldShow = !!user && Notification && Notification.permission !== 'granted' && !dismissed;
    setVisible(shouldShow);
  }, [user]);

  if (!visible) return null;

  const onActivate = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      await subscribeToPushNotifications();
      setVisible(false);
      localStorage.setItem(LS_KEY_DISMISSED, '1');
    }
  };

  const onLater = () => {
    setVisible(false);
    localStorage.setItem(LS_KEY_DISMISSED, '1');
  };

  return (
    <div className="fixed top-0 inset-x-0 z-[60] flex justify-center">
      <div className="mt-2 mx-2 w-full max-w-3xl rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-900 shadow-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <Bell className="w-4 h-4" />
          <div className="text-sm flex-1">
            Activez les notifications pour être alerté des nouveaux Gbairai, messages et commentaires.
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-ivorian-orange hover:bg-orange-600" onClick={onActivate}>
              Activer
            </Button>
            <Button size="sm" variant="ghost" onClick={onLater}>
              Plus tard
            </Button>
            <button aria-label="Fermer" className="p-1" onClick={onLater}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
