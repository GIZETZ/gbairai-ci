import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Send, MessageCircle, ArrowLeft, MoreVertical, Trash2, UserX, EyeOff, Trash, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link, useParams, useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  email: string;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  type: 'text' | 'image' | 'audio' | 'file';
  createdAt: string;
}

interface Conversation {
  id: number;
  participants: User[];
  lastMessage?: {
    content: string;
    timestamp: string;
    senderId: number;
  };
  unreadCount: number;
}

// Fonction pour rendre les liens internes cliquables
function renderMessageContent(content: string) {
  // Regex pour détecter les liens internes (/gbairai/ID)
  const linkPattern = /(\/gbairai\/\d+)/g;
  const parts = content.split(linkPattern);

  return parts.map((part, index) => {
    if (part.match(linkPattern)) {
      return (
        <Link key={index} href={part}>
          <span 
            className="inline-block px-2 py-1 mt-1 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200 rounded-md text-sm font-medium cursor-pointer transition-colors"
            style={{
              border: '1px solid rgba(59, 130, 246, 0.3)',
              textDecoration: 'none'
            }}
          >
            📱 Ouvrir le Gbairai
          </span>
        </Link>
      );
    }
    return part;
  });
}

export default function ConversationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const params = useParams();
  const conversationId = parseInt(params.id as string);

  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // États pour le menu contextuel des messages
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    messageId: number | null;
    isOwnMessage: boolean;
  }>({
    show: false,
    x: 0,
    y: 0,
    messageId: null,
    isOwnMessage: false,
  });
  
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  // États pour le système de réponse
  const [replyingTo, setReplyingTo] = useState<{
    messageId: number;
    content: string;
    senderName: string;
  } | null>(null);
  
  // États pour le swipe gesture
  const [swipeState, setSwipeState] = useState<{
    messageId: number | null;
    startX: number;
    currentX: number;
    isSwipeActive: boolean;
  }>({
    messageId: null,
    startX: 0,
    currentX: 0,
    isSwipeActive: false,
  });

  // Récupérer les détails de la conversation
  const { data: conversation, error: conversationError, isError } = useQuery<Conversation>({
    queryKey: ['/api/conversations', conversationId],
    enabled: !!conversationId,
    retry: 3,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Log pour debug
  console.log('Conversation ID:', conversationId);
  console.log('Conversation data:', conversation);
  console.log('Conversation error:', conversationError);

  // Récupérer les messages de la conversation
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['/api/conversations', conversationId, 'messages'],
    enabled: !!conversationId,
    refetchInterval: 2000,
  });

  // Mutation pour envoyer un message
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string; type: string; replyToId?: number }) => {
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, messageData);
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });

  // Mutation pour supprimer la conversation
  const deleteConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/conversations/${conversationId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blocked-users'] });
      // Rediriger vers la page des messages
      window.location.href = '/messages';
    },
  });

  // Mutation pour bloquer un utilisateur
  const blockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", `/api/users/${userId}/block`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      // Rediriger vers la page des messages
      window.location.href = '/messages';
    },
  });

  // Mutation pour supprimer un message pour soi
  const deleteMessageForSelfMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest("DELETE", `/api/messages/${messageId}/for-me`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
      toast({
        title: "Message supprimé",
        description: "Le message a été supprimé de votre messagerie",
      });
    },
  });

  // Mutation pour supprimer un message pour tout le monde
  const deleteMessageForEveryoneMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest("DELETE", `/api/messages/${messageId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
      toast({
        title: "Message supprimé",
        description: "Le message a été supprimé pour tout le monde",
      });
    },
  });

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fermer le menu contextuel quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(prev => ({ ...prev, show: false }));
    };

    if (contextMenu.show) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.show]);

  // Gestionnaires pour le menu contextuel
  const handleContextMenu = (e: React.MouseEvent, messageId: number, isOwnMessage: boolean) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      messageId,
      isOwnMessage,
    });
  };

  // Gestionnaire pour répondre via clic droit
  const handleReplyFromContextMenu = () => {
    if (contextMenu.messageId) {
      const message = messages.find(m => m.id === contextMenu.messageId);
      if (message) {
        const senderName = message.senderId === user?.id ? 'Vous' : otherParticipant?.username || 'Utilisateur';
        setReplyingTo({
          messageId: message.id,
          content: message.content,
          senderName,
        });
      }
    }
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  const handleTouchStart = (messageId: number, isOwnMessage: boolean) => {
    const timer = setTimeout(() => {
      setContextMenu({
        show: true,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        messageId,
        isOwnMessage,
      });
    }, 500); // 500ms pour l'appui prolongé
    setPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const handleDeleteForSelf = () => {
    if (contextMenu.messageId) {
      deleteMessageForSelfMutation.mutate(contextMenu.messageId);
    }
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  const handleDeleteForEveryone = () => {
    if (contextMenu.messageId) {
      deleteMessageForEveryoneMutation.mutate(contextMenu.messageId);
    }
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  // Gestionnaires pour le swipe
  const handleSwipeStart = (e: React.TouchEvent, messageId: number) => {
    const touch = e.touches[0];
    setSwipeState({
      messageId,
      startX: touch.clientX,
      currentX: touch.clientX,
      isSwipeActive: true,
    });
  };

  const handleSwipeMove = (e: React.TouchEvent) => {
    if (!swipeState.isSwipeActive) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeState.startX;
    
    // Limiter le swipe à droite seulement et avec une distance maximale
    if (deltaX > 0 && deltaX <= 100) {
      setSwipeState(prev => ({
        ...prev,
        currentX: touch.clientX,
      }));
    }
  };

  const handleSwipeEnd = () => {
    if (!swipeState.isSwipeActive) return;
    
    const deltaX = swipeState.currentX - swipeState.startX;
    
    // Si le swipe dépasse 50px, activer la réponse
    if (deltaX > 50 && swipeState.messageId) {
      const message = messages.find(m => m.id === swipeState.messageId);
      if (message) {
        const senderName = message.senderId === user?.id ? 'Vous' : otherParticipant?.username || 'Utilisateur';
        setReplyingTo({
          messageId: message.id,
          content: message.content,
          senderName,
        });
      }
    }
    
    setSwipeState({
      messageId: null,
      startX: 0,
      currentX: 0,
      isSwipeActive: false,
    });
  };

  // Gestionnaire pour annuler la réponse
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    sendMessageMutation.mutate({
      content: newMessage.trim(),
      type: 'text',
      replyToId: replyingTo?.messageId
    });
  };

  const otherParticipant = conversation?.participants.find(p => p.id !== user?.id);

  // Filtrer les messages selon la recherche
  const filteredMessages = messages.filter(message => 
    message.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fonction pour formater la date de manière sécurisée
  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      return format(date, 'HH:mm', { locale: fr });
    } catch (error) {
      return 'Date invalide';
    }
  };

  // Fonction pour supprimer la conversation
  const handleDeleteConversation = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) {
      deleteConversationMutation.mutate();
    }
  };

  // Fonction pour bloquer l'utilisateur
  const handleBlockUser = () => {
    if (otherParticipant && confirm(`Êtes-vous sûr de vouloir bloquer ${otherParticipant.username} ?`)) {
      blockUserMutation.mutate(otherParticipant.id);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Connexion requise
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Veuillez vous connecter pour accéder à vos messages
          </p>
        </div>
      </div>
    );
  }

  if (isError || (!conversation && conversationId)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Conversation non trouvée
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Cette conversation n'existe pas ou vous n'y avez pas accès
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            ID de conversation: {conversationId}
            {conversationError && ` - Erreur: ${(conversationError as any)?.message}`}
          </p>
          <Link href="/messages">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux messages
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* En-tête de la conversation */}
          <Card className="h-[calc(100vh-8rem)] flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Link href="/messages">
                    <Button variant="outline" size="sm">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Retour
                    </Button>
                  </Link>
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-green-500 text-white">
                      {otherParticipant?.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {otherParticipant?.username}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {searchQuery ? `${filteredMessages.length} message${filteredMessages.length > 1 ? 's' : ''} trouvé${filteredMessages.length > 1 ? 's' : ''}` : `${messages.length} message${messages.length > 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>

                {/* Menu d'options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={handleDeleteConversation}
                      className="text-orange-600 dark:text-orange-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer la conversation
                    </DropdownMenuItem>
                    {otherParticipant?.email !== 'gbairai.app@gmail.com' && (
                      <DropdownMenuItem 
                        onClick={handleBlockUser}
                        className="text-red-600 dark:text-red-400"
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        Bloquer {otherParticipant?.username}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Barre de recherche */}
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher dans les messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-50 dark:bg-gray-800"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    ✕
                  </Button>
                )}
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {filteredMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    {searchQuery ? (
                      <>
                        <p className="text-lg">Aucun message trouvé</p>
                        <p className="text-sm">Essayez avec d'autres mots-clés</p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg">Aucun message pour le moment</p>
                        <p className="text-sm">Commencez la conversation !</p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                filteredMessages.map((message) => {
                  const isSwipeActive = swipeState.isSwipeActive && swipeState.messageId === message.id;
                  const swipeDistance = isSwipeActive ? Math.max(0, Math.min(100, swipeState.currentX - swipeState.startX)) : 0;
                  
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex relative",
                        message.senderId === user.id ? "justify-end" : "justify-start"
                      )}
                    >
                      {/* Indicateur de réponse lors du swipe */}
                      {isSwipeActive && swipeDistance > 20 && (
                        <div 
                          className="absolute left-0 top-1/2 transform -translate-y-1/2 text-blue-500 transition-opacity"
                          style={{ 
                            opacity: Math.min(1, swipeDistance / 50),
                            left: `${Math.min(20, swipeDistance - 20)}px`
                          }}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
                          </svg>
                        </div>
                      )}
                      
                      <div 
                        className="max-w-[70%] transition-transform duration-150"
                        style={{
                          transform: isSwipeActive ? `translateX(${Math.min(50, swipeDistance)}px)` : 'translateX(0px)'
                        }}
                      >
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span className="font-medium">
                            {message.senderId === user.id ? 'Vous' : otherParticipant?.username}
                          </span>
                          <span className="ml-2">
                            {formatMessageTime(message.createdAt)}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "px-4 py-2 rounded-2xl text-white break-words cursor-pointer select-none",
                            message.senderId === user.id
                              ? "bg-blue-500 rounded-br-sm"
                              : "bg-gray-600 rounded-bl-sm"
                          )}
                          onContextMenu={(e) => handleContextMenu(e, message.id, message.senderId === user.id)}
                          onTouchStart={(e) => handleSwipeStart(e, message.id)}
                          onTouchMove={handleSwipeMove}
                          onTouchEnd={handleSwipeEnd}
                        >
                          {/* Affichage de la réponse si elle existe */}
                          {(message as any).replyToMessage && (
                            <div className="mb-2 p-2 rounded bg-black bg-opacity-20 border-l-2 border-white border-opacity-50">
                              <div className="text-xs font-medium opacity-80 mb-1">
                                {(message as any).replyToMessage.senderName}
                              </div>
                              <div className="text-sm opacity-90 truncate">
                                {(message as any).replyToMessage.content.length > 30 
                                  ? `${(message as any).replyToMessage.content.substring(0, 30)}...`
                                  : (message as any).replyToMessage.content
                                }
                              </div>
                            </div>
                          )}
                          {searchQuery ? (
                            <span dangerouslySetInnerHTML={{
                              __html: renderMessageContent(message.content)
                                .map(part => typeof part === 'string' ? part : '')
                                .join('')
                                .replace(
                                  new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                                  '<mark style="background-color: yellow; color: black;">$1</mark>'
                                )
                            }} />
                          ) : (
                            renderMessageContent(message.content)
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Zone de saisie */}
            <div className="p-4 border-t">
              {/* Indicateur de réponse */}
              {replyingTo && (
                <div className="mb-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                        Répondre à {replyingTo.senderName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {replyingTo.content.length > 50 
                          ? `${replyingTo.content.substring(0, 50)}...` 
                          : replyingTo.content
                        }
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelReply}
                      className="ml-2 h-8 w-8 p-0"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={replyingTo ? "Répondre..." : "Tapez votre message..."}
                  className="flex-1"
                  disabled={sendMessageMutation.isPending}
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Menu contextuel pour les messages */}
        {contextMenu.show && (
          <div
            className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 z-50"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              top: Math.min(contextMenu.y, window.innerHeight - 120),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleReplyFromContextMenu}
              className="w-full px-4 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
              </svg>
              Répondre
            </button>
            <button
              onClick={handleDeleteForSelf}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              disabled={deleteMessageForSelfMutation.isPending}
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Supprimer pour moi
            </button>
            {contextMenu.isOwnMessage && (
              <button
                onClick={handleDeleteForEveryone}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                disabled={deleteMessageForEveryoneMutation.isPending}
              >
                <Trash className="w-4 h-4 mr-2" />
                Supprimer pour tout le monde
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}