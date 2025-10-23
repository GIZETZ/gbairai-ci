
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageCircle, Search, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

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

export default function MessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");

  // Récupérer tous les utilisateurs
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!user,
  });

  // Récupérer les conversations
  const { data: conversations = [], refetch: refetchConversations } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    enabled: !!user,
    refetchInterval: 2000, // Rafraîchir toutes les 2 secondes
    staleTime: 0, // Considérer les données comme périmées immédiatement
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Récupérer les utilisateurs bloqués
  const { data: blockedUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/blocked-users'],
    enabled: !!user,
  });

  // Mutation pour créer une nouvelle conversation
  const createConversationMutation = useMutation({
    mutationFn: async (participantId: number) => {
      const response = await apiRequest("POST", "/api/conversations", {
        participantId: participantId
      });
      return response.json();
    },
    onSuccess: (result) => {
      // Forcer le rafraîchissement immédiat
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blocked-users'] });
      
      // Attendre un peu pour que la conversation soit créée
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/conversations'] });
        
        // Vérifier que l'ID de conversation est valide
        const conversationId = result.conversationId || result.id;
        if (conversationId && !isNaN(conversationId)) {
          window.location.href = `/messages/${conversationId}`;
        } else {
          console.error("ID de conversation invalide:", result);
        }
      }, 500);
    },
  });

  const handleStartConversation = (userId: number) => {
    // Vérifier si une conversation existe déjà
    const existingConversation = conversations.find(conv => 
      conv.participants.some(p => p.id === userId)
    );
    
    if (existingConversation && existingConversation.id) {
      window.location.href = `/messages/${existingConversation.id}`;
    } else {
      createConversationMutation.mutate(userId);
    }
  };

  // Filtrer les conversations pour exclure celles avec des utilisateurs bloqués
  const filteredConversations = conversations.filter(conversation => {
    // Debug détaillé pour chaque conversation
    console.log('Analyse conversation:', {
      id: conversation.id,
      participants: conversation.participants,
      participantCount: conversation.participants?.length || 0
    });
    
    // Vérifier si la conversation a des participants valides
    if (!conversation.participants || conversation.participants.length === 0) {
      console.log('❌ Conversation sans participants:', conversation.id);
      return false;
    }
    
    // Vérifier si l'utilisateur actuel est dans les participants
    const isUserInConversation = conversation.participants.some(p => p.id === user?.id);
    if (!isUserInConversation) {
      console.log('❌ Utilisateur actuel pas dans la conversation:', conversation.id);
      return false;
    }
    
    const otherParticipant = conversation.participants.find(p => p.id !== user?.id);
    if (!otherParticipant) {
      console.log('❌ Pas d\'autre participant trouvé pour conversation:', conversation.id);
      return false;
    }
    
    // Exclure les conversations avec des utilisateurs bloqués
    const isBlocked = blockedUsers.some(blocked => blocked.id === otherParticipant.id);
    if (isBlocked) {
      console.log('❌ Conversation avec utilisateur bloqué:', otherParticipant.username);
      return false;
    }
    
    console.log('✅ Conversation valide:', {
      id: conversation.id,
      otherParticipant: otherParticipant.username,
      lastMessage: conversation.lastMessage ? 'oui' : 'non'
    });
    
    return true;
  });

  const filteredUsers = allUsers.filter(u => {
    // Exclure l'utilisateur actuel
    if (u.id === user?.id) return false;
    
    // Exclure les utilisateurs bloqués
    const isBlocked = blockedUsers.some(blocked => blocked.id === u.id);
    if (isBlocked) return false;
    
    // Exclure les utilisateurs avec qui on a déjà une conversation
    const hasConversation = filteredConversations.some(conv => 
      conv.participants.some(p => p.id === u.id)
    );
    if (hasConversation) return false;
    
    // Filtrer par recherche
    return u.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Debug des conversations
  console.log('=== DEBUG CONVERSATIONS ===');
  console.log('Utilisateur actuel:', user?.id, user?.username);
  console.log('Conversations brutes récupérées:', conversations.length);
  console.log('Conversations après filtrage:', filteredConversations.length);
  console.log('Utilisateurs bloqués:', blockedUsers.length);
  
  // Détail de chaque conversation brute
  conversations.forEach(conv => {
    console.log(`Conversation ${conv.id}:`, {
      participants: conv.participants.map(p => `${p.username} (${p.id})`),
      lastMessage: conv.lastMessage ? conv.lastMessage.content.substring(0, 20) + '...' : 'Aucun',
      unreadCount: conv.unreadCount
    });
  });
  
  if (conversations.length !== filteredConversations.length) {
    const rejected = conversations.filter(c => !filteredConversations.includes(c));
    console.log('Conversations rejetées par le filtrage:', rejected.map(c => ({
      id: c.id,
      participants: c.participants.map(p => p.username)
    })));
  }
  console.log('=== FIN DEBUG ===');

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4 max-w-md sm:max-w-2xl lg:max-w-4xl">
        <div className="space-y-4">
          
          {/* En-tête mobile optimisé */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Link href="/">
                    <Button variant="outline" size="sm" className="flex-shrink-0">
                      <ArrowLeft className="w-4 h-4 sm:mr-2 text-base sm:text-lg font-semibold text-gray-900 dark:text-white" />
                      <span className="hidden sm:inline">Retour</span>
                    </Button>
                  </Link>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    Messages
                  </h1>
                </div>
                <div className="flex items-center space-x-2">
                  <Link href="/blocked-users">
                    <Button variant="outline" size="sm" className="flex-shrink-0">
                      <Users className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline text-base sm:text-lg font-normal text-gray-900 dark:text-white">Utilisateurs bloqués</span>
                      <span className="sm:hidden text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Bloqués</span>
                    </Button>
                  </Link>
                  <Badge variant="secondary" className="text-xs text-base sm:text-lg font-normal text-gray-900 dark:text-white">
                    {filteredConversations.length}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Recherche d'utilisateurs */}
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Nouvelle conversation
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher un utilisateur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-base sm:text-lg font-semibold text-gray-900 dark:text-white"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleStartConversation(user.id)}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-blue-500 text-white text-sm">
                        {user.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.username}
                      </p>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && searchQuery && (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                    Aucun utilisateur trouvé
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Liste des conversations */}
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Vos conversations
              </h2>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm sm:text-base">Aucune conversation</p>
                    <p className="text-xs sm:text-sm">Commencez en cherchant un utilisateur</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const otherUser = conversation.participants.find(p => p.id !== user.id);
                    return (
                      <Link key={conversation.id} href={`/messages/${conversation.id}`}>
                        <div className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors border hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent">
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarFallback className="bg-green-500 text-white">
                              {otherUser?.username[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {otherUser?.username}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs min-w-[20px] h-5 flex items-center justify-center ml-2 bg-red-500 text-white font-bold rounded-full flex-shrink-0">
                                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                            {conversation.lastMessage && (
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
                                  {conversation.lastMessage.content}
                                </p>
                                {conversation.lastMessage.timestamp && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
                                    {new Date(conversation.lastMessage.timestamp).toLocaleTimeString('fr-FR', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
