import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, UserMinus, MapPin, Globe, Edit3, Users, Heart, MessageCircle, Share2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { UserWithStats, UserProfile, GbairaiWithInteractions } from '@shared/schema';
import { MobileLayout } from '@/components/Common/MobileLayout';
import { useToast } from '@/hooks/use-toast';
import { GbairaiCard } from '@/components/Gbairai/GbairaiCard';

const profileSchema = z.object({
  bio: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  avatar: z.string().url().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function UserProfilePage() {
  const [match, params] = useRoute('/profile/:userId');
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const userId = match ? parseInt(params?.userId || '0') : 0;
  const isOwnProfile = currentUser?.id === userId;

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: '',
      location: '',
      website: '',
      avatar: '',
    },
  });

  // Récupérer le profil utilisateur
  const { data: userProfile, isLoading } = useQuery<UserWithStats>({
    queryKey: [`/api/users/${userId}/profile`],
    enabled: !!userId,
  });

  // Récupérer les gbairais de l'utilisateur
  const { data: userGbairais } = useQuery<GbairaiWithInteractions[]>({
    queryKey: [`/api/users/${userId}/gbairais`],
    enabled: !!userId,
  });

  // Récupérer les followers
  const { data: followers } = useQuery<UserWithStats[]>({
    queryKey: [`/api/users/${userId}/followers`],
    enabled: !!userId,
  });

  // Récupérer les following
  const { data: following } = useQuery<UserWithStats[]>({
    queryKey: [`/api/users/${userId}/following`],
    enabled: !!userId,
  });

  // Mutation pour suivre/ne plus suivre
  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      try {
        if (action === 'follow') {
          const response = await apiRequest('POST', `/api/users/${userId}/follow`);
          return { action, response };
        } else {
          const response = await apiRequest('DELETE', `/api/users/${userId}/follow`);
          return { action, response };
        }
      } catch (error: any) {
        console.error('Erreur dans followMutation:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Mettre à jour l'état local immédiatement
      queryClient.setQueryData([`/api/users/${userId}/profile`], (old: any) => ({
        ...old,
        isFollowing: variables === 'follow',
        followersCount: old?.followersCount ? (
          variables === 'follow' ? old.followersCount + 1 : old.followersCount - 1
        ) : 0
      }));

      // Invalider les queries pour synchroniser
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/profile`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/followers`] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/search'] });
      
      // Message de succès
      toast({
        title: 'Succès',
        description: variables === 'follow' ? 'Vous suivez maintenant cet utilisateur' : 'Vous ne suivez plus cet utilisateur',
      });
    },
    onError: (error: any, variables) => {
      console.error('Erreur follow/unfollow:', error);
      
      let errorMessage = 'Une erreur est survenue';
      
      // Gestion des erreurs spécifiques
      if (error.response?.status === 400) {
        if (error.message?.includes('déjà') || error.response?.data?.error?.includes('déjà')) {
          // L'utilisateur suit déjà - mettre à jour l'état sans erreur
          queryClient.setQueryData([`/api/users/${userId}/profile`], (old: any) => ({
            ...old,
            isFollowing: true
          }));
          return;
        } else if (error.message?.includes('vous-même') || error.response?.data?.error?.includes('vous-même')) {
          errorMessage = 'Vous ne pouvez pas vous suivre vous-même';
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.response?.status === 404) {
        errorMessage = variables === 'unfollow' ? 'Vous ne suivez pas cet utilisateur' : 'Utilisateur non trouvé';
      } else if (error.response?.status === 401) {
        errorMessage = 'Vous devez être connecté pour effectuer cette action';
      }
      
      // Rafraîchir les données du profil pour synchroniser l'état
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/profile`] });
      
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Mutation pour mettre à jour le profil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest('PUT', '/api/users/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/profile`] });
      setIsEditDialogOpen(false);
      toast({
        title: 'Succès',
        description: 'Profil mis à jour avec succès',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la mise à jour',
        variant: 'destructive',
      });
    },
  });

  // Mettre à jour le formulaire quand le profil est chargé
  useEffect(() => {
    if (userProfile?.profile) {
      const profile = userProfile.profile as UserProfile;
      form.reset({
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        avatar: profile.avatar || '',
      });
    }
  }, [userProfile, form]);

  const handleFollow = () => {
    if (!currentUser) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté pour suivre un utilisateur',
        variant: 'destructive',
      });
      return;
    }
    
    if (followMutation.isPending) {
      return; // Éviter les requêtes multiples
    }
    
    const action = userProfile?.isFollowing ? 'unfollow' : 'follow';
    followMutation.mutate(action);
  };

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </MobileLayout>
    );
  }

  if (!userProfile) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center min-h-screen text-center">
          <h2 className="text-2xl font-bold mb-4">Utilisateur non trouvé</h2>
          <p className="text-gray-600 mb-4">Cet utilisateur n'existe pas ou n'est plus actif.</p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const profile = userProfile.profile as UserProfile || {};

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-green-500 to-orange-600">
        {/* Header avec bouton retour */}
        <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-md">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          
          {isOwnProfile && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Modifier le profil</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Parlez-nous de vous..."
                              {...field}
                              maxLength={200}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Localisation</FormLabel>
                          <FormControl>
                            <Input placeholder="Ville, Pays" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Site web</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditDialogOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? 'Mise à jour...' : 'Sauvegarder'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Profil utilisateur */}
        <div className="px-4 pb-4">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {userProfile.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">{userProfile.username}</h1>
                    <p className="text-white/70">
                      Membre depuis {formatDistanceToNow(new Date(userProfile.createdAt!), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </div>
                
                {!isOwnProfile && currentUser && (
                  <Button
                    onClick={handleFollow}
                    disabled={followMutation.isPending}
                    className={userProfile.isFollowing ? 
                      "bg-red-500 hover:bg-red-600 text-white disabled:opacity-50" : 
                      "bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
                    }
                  >
                    {followMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {userProfile.isFollowing ? 'Arrêt...' : 'Suivi...'}
                      </>
                    ) : userProfile.isFollowing ? (
                      <>
                        <UserMinus className="w-4 h-4 mr-2" />
                        Suivi
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Suivre
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Description */}
              {profile.bio && (
                <p className="text-white/90 mb-4">{profile.bio}</p>
              )}

              {/* Informations */}
              <div className="flex flex-wrap gap-4 mb-4">
                {profile.location && (
                  <div className="flex items-center text-white/70">
                    <MapPin className="w-4 h-4 mr-1" />
                    {profile.location}
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center text-white/70">
                    <Globe className="w-4 h-4 mr-1" />
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                      Site web
                    </a>
                  </div>
                )}
              </div>

              {/* Statistiques */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-orange-500/20 rounded-lg p-3 border border-orange-400/30">
                  <div className="text-2xl font-bold text-white">{userProfile.gbairaisCount}</div>
                  <div className="text-orange-100 text-sm">Gbairais</div>
                </div>
                <div className="bg-green-500/20 rounded-lg p-3 border border-green-400/30">
                  <div className="text-2xl font-bold text-white">{userProfile.followersCount}</div>
                  <div className="text-green-100 text-sm">Abonnés</div>
                </div>
                <div className="bg-yellow-500/20 rounded-lg p-3 border border-yellow-400/30">
                  <div className="text-2xl font-bold text-white">{userProfile.followingCount}</div>
                  <div className="text-yellow-100 text-sm">Abonnements</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contenu par onglets */}
        <div className="px-4 pb-20">
          <Tabs defaultValue="gbairais" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-md">
              <TabsTrigger value="gbairais" className="text-white data-[state=active]:bg-orange-500/30 data-[state=active]:text-white">
                Gbairais
              </TabsTrigger>
              <TabsTrigger value="followers" className="text-white data-[state=active]:bg-green-500/30 data-[state=active]:text-white">
                Abonnés
              </TabsTrigger>
              <TabsTrigger value="following" className="text-white data-[state=active]:bg-yellow-500/30 data-[state=active]:text-white">
                Abonnements
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="gbairais" className="mt-4">
              <div className="space-y-4">
                {userGbairais?.filter(gbairai => !gbairai.isAnonymous).map((gbairai) => (
                  <GbairaiCard key={gbairai.id} gbairai={gbairai} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="followers" className="mt-4">
              <div className="space-y-4">
                {followers?.map((follower) => (
                  <Card key={follower.id} className="bg-white/10 backdrop-blur-md border-white/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                            {follower.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{follower.username}</h3>
                            <p className="text-white/70 text-sm">{follower.followersCount} abonnés</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20"
                          onClick={() => window.location.href = `/profile/${follower.id}`}
                        >
                          Voir le profil
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="following" className="mt-4">
              <div className="space-y-4">
                {following?.map((followed) => (
                  <Card key={followed.id} className="bg-white/10 backdrop-blur-md border-white/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                            {followed.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{followed.username}</h3>
                            <p className="text-white/70 text-sm">{followed.followersCount} abonnés</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20"
                          onClick={() => window.location.href = `/profile/${followed.id}`}
                        >
                          Voir le profil
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MobileLayout>
  );
}
