
import { useState, useEffect } from 'react';

interface OfflineAction {
  id: string;
  type: 'create_gbairai' | 'create_comment' | 'like_gbairai';
  data: any;
  timestamp: number;
}

export function useOfflineSync() {
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Charger les actions en attente
    const stored = localStorage.getItem('gbairai_pending_actions');
    if (stored) {
      setPendingActions(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    // Sauvegarder les actions en attente
    localStorage.setItem('gbairai_pending_actions', JSON.stringify(pendingActions));
  }, [pendingActions]);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      // Synchroniser quand on revient en ligne
      if (online && pendingActions.length > 0) {
        syncPendingActions();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [pendingActions]);

  const addPendingAction = (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const newAction: OfflineAction = {
      ...action,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    
    setPendingActions(prev => [...prev, newAction]);
    
    // Essayer de synchroniser immédiatement si en ligne
    if (isOnline) {
      setTimeout(() => syncPendingActions(), 1000);
    }
  };

  const syncPendingActions = async () => {
    if (!isOnline || pendingActions.length === 0) return;

    const actionsToSync = [...pendingActions];
    
    for (const action of actionsToSync) {
      try {
        await executeAction(action);
        setPendingActions(prev => prev.filter(a => a.id !== action.id));
      } catch (error) {
        console.error('Erreur sync action:', action, error);
        // Garder l'action pour réessayer plus tard
      }
    }
  };

  const executeAction = async (action: OfflineAction) => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    
    switch (action.type) {
      case 'create_gbairai':
        await fetch(`${baseUrl}/api/gbairais`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(action.data)
        });
        break;
        
      case 'create_comment':
        await fetch(`${baseUrl}/api/gbairais/${action.data.gbairaiId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(action.data)
        });
        break;
        
      case 'like_gbairai':
        await fetch(`${baseUrl}/api/gbairais/${action.data.gbairaiId}/like`, {
          method: 'POST',
          credentials: 'include'
        });
        break;
    }
  };

  return {
    isOnline,
    pendingActions,
    addPendingAction,
    syncPendingActions
  };
}
