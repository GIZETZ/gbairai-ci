import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Heart, MessageCircle, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MobileLayout } from '@/components/Common/MobileLayout';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { notificationsApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: number;
  type: 'like' | 'comment' | 'follow' | 'system';
  message: string;
  createdAt: string;
  read: boolean;
  fromUser?: {
    id: number;
    username: string;
  };
  gbairai?: {
    id: number;
    content: string;
  };
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);

  // Récupérer les notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getNotifications,
    enabled: !!user
  });

  // Synchroniser les notifications locales avec les données de l'API
  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  // Mutation pour marquer une notification comme lue
  const markAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: (_, notificationId) => {
      // Mise à jour optimiste locale
      setLocalNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
      
      // Mettre à jour le cache directement sans refetch
      queryClient.setQueryData(['notifications'], (oldData: Notification[] = []) => 
        oldData.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de marquer la notification comme lue",
        variant: "destructive",
      });
    }
  });

  // Mutation pour marquer toutes les notifications comme lues
  const markAllAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      // Mise à jour optimiste locale
      setLocalNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      
      // Mettre à jour le cache directement
      queryClient.setQueryData(['notifications'], (oldData: Notification[] = []) => 
        oldData.map(notif => ({ ...notif, read: true }))
      );
      
      toast({
        title: "Notifications marquées",
        description: "Toutes les notifications ont été marquées comme lues",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de marquer toutes les notifications comme lues",
        variant: "destructive",
      });
    }
  });

  const handleNotificationClick = async (notification: Notification) => {
    // Marquer comme lue si pas encore lu
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Naviguer vers la destination
    if (notification.gbairai) {
      setLocation(`/gbairai/${notification.gbairai.id}`);
    }
    // Si c'est un suivi, naviguer vers le profil utilisateur
    else if (notification.type === 'follow' && notification.fromUser) {
      setLocation(`/profile/${notification.fromUser.id}`);
    }
  };

  const handleMarkAllAsRead = () => {
    const unreadCount = localNotifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
      markAllAsReadMutation.mutate();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'system':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'like':
        return 'from-red-400 to-pink-500';
      case 'comment':
        return 'from-blue-400 to-cyan-500';
      case 'follow':
        return 'from-green-400 to-emerald-500';
      case 'system':
        return 'from-orange-400 to-yellow-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const unreadCount = localNotifications.filter(n => !n.read).length;

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="text-gray-600 hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <Badge className="bg-blue-500 text-white text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-blue-600 hover:bg-blue-50 text-xs font-medium"
                disabled={markAllAsReadMutation.isPending}
              >
                Tout lire
              </Button>
            )}
          </div>
        </div>

        {/* Liste des notifications natives */}
        <div className="px-2 space-y-1">
          {isLoading ? (
            <div className="notification-item loading">
              <div className="notification-content">
                <div className="notification-header">
                  <div className="notification-icon-skeleton"></div>
                  <div className="notification-title-skeleton"></div>
                </div>
                <div className="notification-body-skeleton"></div>
                <div className="notification-time-skeleton"></div>
              </div>
            </div>
          ) : localNotifications.length === 0 ? (
            <div className="notification-item empty">
              <div className="notification-content">
                <div className="notification-header">
                  <div className="notification-icon">
                    <AlertCircle className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="notification-title text-gray-600">Aucune notification</div>
                </div>
                <div className="notification-body text-gray-500">
                  Vous n'avez aucune notification pour le moment
                </div>
              </div>
            </div>
          ) : (
            localNotifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`notification-item ${!notification.read ? 'unread' : ''} ${
                  notification.gbairai || notification.type === 'follow' ? 'interactive' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-content">
                  <div className="notification-header">
                    <div className={`notification-icon ${notification.type}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-meta">
                      <div className="notification-title">Gbairai</div>
                      <div className="notification-time">
                        {formatDistanceToNow(new Date(notification.createdAt), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="notification-indicator"></div>
                    )}
                  </div>
                  
                  <div className="notification-body">
                    {notification.message}
                    {notification.gbairai && (
                      <div className="notification-preview">
                        "{notification.gbairai.content}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
}