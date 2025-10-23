import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Message, Conversation, User } from '@shared/schema';

export interface ConversationWithDetails extends Conversation {
  participants: Array<{
    id: number;
    username: string;
    email: string;
  }>;
  lastMessage?: {
    content: string;
    timestamp: Date;
    senderId: number;
  };
  unreadCount: number;
}

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users');
      return response.json();
    },
  });
}

export function useConversations() {
  return useQuery<ConversationWithDetails[]>({
    queryKey: ['/api/conversations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/conversations');
      const data = await response.json();
      console.log('Conversations récupérées:', data.length);
      return data;
    },
    refetchInterval: 2000, // Rafraîchir toutes les 2 secondes
    staleTime: 0, // Données toujours considérées comme périmées
    refetchOnWindowFocus: true, // Rafraîchir quand la fenêtre reprend le focus
    refetchOnMount: true, // Rafraîchir au montage
    retry: 3, // Réessayer en cas d'erreur
  });
}

export function useMessages(conversationId: number) {
  const queryClient = useQueryClient();
  
  return useQuery<Message[]>({
    queryKey: ['/api/conversations', conversationId, 'messages'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/conversations/${conversationId}/messages`);
      const messages = await response.json();
      
      // Invalider la liste des conversations pour mettre à jour les compteurs
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      
      return messages;
    },
    enabled: !!conversationId,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipientId: number) => {
      const response = await apiRequest('POST', '/api/conversations', {
        recipientId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      type = 'text',
    }: {
      conversationId: number;
      content: string;
      type?: string;
    }) => {
      const response = await apiRequest('POST', `/api/conversations/${conversationId}/messages`, {
        content,
        type,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Mise à jour optimiste pour éviter les re-rendus
      queryClient.setQueryData(['/api/conversations', variables.conversationId, 'messages'], (oldData: any) => {
        if (!oldData) return [data];
        return [...oldData, data];
      });
      
      // Invalidation immédiate des conversations pour mettre à jour lastMessage
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations'] 
      });
      
      // Invalidation différée pour éviter les problèmes de focus
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/conversations', variables.conversationId, 'messages'] 
        });
      }, 200);
    },
  });
}