
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserX, ArrowLeft, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface BlockedUser {
  id: number;
  username: string;
  email: string;
  blockedAt: string;
}

export default function BlockedUsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer les utilisateurs bloqués
  const { data: blockedUsers = [] } = useQuery<BlockedUser[]>({
    queryKey: ['/api/blocked-users'],
    enabled: !!user,
  });

  // Mutation pour débloquer un utilisateur
  const unblockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/users/${userId}/block`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blocked-users'] });
      toast({
        title: "Utilisateur débloqué",
        description: "Cet utilisateur peut maintenant vous envoyer des messages.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: "Impossible de débloquer cet utilisateur",
        variant: "destructive",
      });
    },
  });

  const handleUnblockUser = (userId: number) => {
    unblockUserMutation.mutate(userId);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Connexion requise
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Veuillez vous connecter pour voir vos utilisateurs bloqués
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* En-tête */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Link href="/messages">
                    <Button className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white" variant="outline" size="sm">
                      <ArrowLeft className="w-4 h-4 mr-2 text-base sm:text-lg font-semibold text-gray-900 dark:text-white"/>
                      Retour aux messages
                    </Button>
                  </Link>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Utilisateurs bloqués
                  </h1>
                </div>
                <Badge variant="secondary">
                  {blockedUsers.length} utilisateurs bloqués
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Liste des utilisateurs bloqués */}
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Gérer vos blocages
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ces utilisateurs ne peuvent pas vous envoyer de messages
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {blockedUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <UserX className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Aucun utilisateur bloqué</p>
                    <p className="text-sm">Vous pouvez bloquer des utilisateurs depuis leurs conversations</p>
                  </div>
                ) : (
                  blockedUsers.map((blockedUser) => (
                    <div
                      key={blockedUser.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-red-500 text-white">
                            {blockedUser.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {blockedUser.username}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Bloqué le {format(new Date(blockedUser.blockedAt), 'dd MMMM yyyy', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnblockUser(blockedUser.id)}
                        disabled={unblockUserMutation.isPending}
                      >
                        Débloquer
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
