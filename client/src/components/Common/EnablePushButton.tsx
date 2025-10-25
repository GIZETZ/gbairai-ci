import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestNotificationPermission, subscribeToPushNotifications } from '@/serviceWorkerRegistration';

export default function EnablePushButton() {
  const [enabled, setEnabled] = useState(Notification.permission === 'granted');
  const [loading, setLoading] = useState(false);

  const onEnable = async () => {
    try {
      setLoading(true);
      const permission = await requestNotificationPermission();
      if (!permission) {
        alert('Permission de notifications refusée.');
        setEnabled(false);
        return;
      }
      const sub = await subscribeToPushNotifications();
      if (sub) setEnabled(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={onEnable} disabled={loading || enabled} variant={enabled ? 'outline' : 'default'} size="sm">
      {enabled ? <Bell className="w-4 h-4 mr-2"/> : <BellOff className="w-4 h-4 mr-2"/>}
      {enabled ? 'Notifications activées' : (loading ? 'Activation…' : 'Activer les notifications')}
    </Button>
  );
}
