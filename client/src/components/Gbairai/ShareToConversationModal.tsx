import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface User {
  id: number;
  username: string;
  email: string;
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

interface ShareToConversationModalProps {
  gbairaiId: number;
  gbairaiContent: string;
  trigger: React.ReactNode;
}

export function ShareToConversationModal({ gbairaiId, gbairaiContent, trigger }: ShareToConversationModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Récupérer les conversations de l'utilisateur
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    enabled: isOpen,
  });

  // Récupérer tous les utilisateurs pour la recherche
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: isOpen,
  });

  // Filtrer les conversations et utilisateurs selon la recherche
  const filteredConversations = conversations.filter(conv => 
    conv.participants.some(participant => 
      participant.id !== user?.id && 
      participant.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const filteredUsers = allUsers.filter(u => 
    u.id !== user?.id && 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !conversations.some(conv => conv.participants.some(p => p.id === u.id))
  );

  // Mutation pour envoyer un message avec le lien du Gbairai
  const sendGbairaiLinkMutation = useMutation({
    mutationFn: async ({ conversationId, targetUserId }: { conversationId?: number; targetUserId?: number }) => {
      let finalConversationId = conversationId;
      
      // Si pas de conversation existante, créer une nouvelle conversation
      if (!finalConversationId && targetUserId) {
        const createConvResponse = await apiRequest("POST", '/api/conversations', {
          participants: [user?.id, targetUserId]
        });
        const newConversation = await createConvResponse.json();
        finalConversationId = newConversation.id;
      }

      if (!finalConversationId) {
        throw new Error("Impossible de créer ou trouver la conversation");
      }

      // Envoyer le message avec le lien interne du Gbairai
      const internalLink = `/gbairai/${gbairaiId}`;
      const messageContent = `📩 Gbairai partagé: "${gbairaiContent.substring(0, 50)}${gbairaiContent.length > 50 ? '...' : ''}"\n\n🔗 Voir le Gbairai: ${internalLink}`;
      
      const response = await apiRequest("POST", `/api/conversations/${finalConversationId}/messages`, {
        content: messageContent,
        type: 'text'
      });
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Gbairai partagé",
        description: "Le lien du Gbairai a été envoyé dans la conversation"
      });
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de partager le Gbairai",
        variant: "destructive"
      });
    }
  });

  const handleShareToConversation = (conversationId: number) => {
    sendGbairaiLinkMutation.mutate({ conversationId });
  };

  const handleShareToUser = (userId: number) => {
    sendGbairaiLinkMutation.mutate({ targetUserId: userId });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
        style={{
          backgroundColor: 'white',
          borderColor: 'rgba(229, 231, 235, 1)',
          zIndex: 10000
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Partager dans une discussion</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Sélectionnez un utilisateur ou une conversation pour partager ce Gbairai
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Liste des conversations et utilisateurs */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {/* Conversations existantes */}
              {filteredConversations.map((conversation) => {
                const otherParticipant = conversation.participants.find(p => p.id !== user?.id);
                return (
                  <div
                    key={conversation.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    onClick={() => handleShareToConversation(conversation.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-orange-500 text-white">
                          {otherParticipant?.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{otherParticipant?.username}</p>
                        {conversation.lastMessage && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {conversation.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
                    <Send className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </div>
                );
              })}

              {/* Utilisateurs sans conversation */}
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => handleShareToUser(user.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-green-500 text-white">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.username}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Nouvelle conversation</p>
                    </div>
                  </div>
                  <Send className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
              ))}

              {/* Message si aucun résultat */}
              {filteredConversations.length === 0 && filteredUsers.length === 0 && (
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                  Aucun utilisateur trouvé
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}