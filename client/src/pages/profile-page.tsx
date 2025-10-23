import { useAuth } from "@/hooks/use-auth";
import { useUserGbairais } from "@/hooks/useGbairais";
import { MobileLayout } from "@/components/Common/MobileLayout";
import { UserGbairaiManagement } from "@/components/Gbairai/UserGbairaiManagement";
import { UserSettings } from "@/components/Settings/UserSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  MapPin, 
  Calendar, 
  MessageCircle, 
  Heart, 
  Share2, 
  LogOut, 
  Edit, 
  Settings,
  Plus,
  BarChart3
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";

// Schema for profile update
const updateProfileSchema = z.object({
  username: z.string().min(2, "Le nom d'utilisateur doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
});

type UpdateProfileData = z.infer<typeof updateProfileSchema>;

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { data: userGbairais, isLoading } = useUserGbairais(user?.id || 0);
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const form = useForm<UpdateProfileData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const response = await apiRequest("PUT", "/api/users/profile", data);
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      setIsEditDialogOpen(false);
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleUpdateProfile = (data: UpdateProfileData) => {
    updateProfileMutation.mutate(data);
  };

  if (!user) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <User className="w-16 h-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-300 mb-2">Connexion requise</h2>
          <p className="text-gray-400 text-center mb-6">
            Vous devez être connecté pour voir votre profil
          </p>
          <Link href="/auth">
            <Button>Se connecter</Button>
          </Link>
        </div>
      </MobileLayout>
    );
  }

  const totalLikes = userGbairais?.reduce((sum, g) => sum + g.likesCount, 0) || 0;
  const totalComments = userGbairais?.reduce((sum, g) => sum + g.commentsCount, 0) || 0;
  const totalShares = userGbairais?.reduce((sum, g) => sum + g.sharesCount, 0) || 0;

  // Afficher les paramètres si demandé
  if (showSettings) {
    return (
      <MobileLayout>
        <UserSettings onBack={() => setShowSettings(false)} />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
        <div className="space-y-6 p-4 pt-24">
        {/* Profile Header */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-gray-900 dark:text-white text-xl">{user.username}</CardTitle>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{user.email}</p>
            <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 text-sm mt-2">
              <Calendar className="w-4 h-4" />
              Membre depuis {formatDistanceToNow(new Date(user.createdAt || new Date()), { locale: fr })}
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">{userGbairais?.length || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Gbairais</div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-500">{totalLikes}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Likes</div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{totalComments}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Commentaires</div>
            </CardContent>
          </Card>
        </div>  

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/create">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Gbairai
            </Button>
          </Link>
          <Button 
            variant="outline"
            onClick={() => setShowSettings(true)}
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
          >
            <Settings className="w-4 h-4 mr-2" />
            Paramètres
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                <Edit className="w-4 h-4 mr-2" />
                Modifier profil
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white">Modifier le profil</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleUpdateProfile)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300">Nom d'utilisateur</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Votre nom d'utilisateur"
                            className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300">Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="Votre email"
                            className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                      className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {updateProfileMutation.isPending ? "Mise à jour..." : "Sauvegarder"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="flex-1"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger 
              value="publications"
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Mes Publications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-white/90 dark:bg-gray-800/90 border-gray-300 dark:border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Statistiques d'activité</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Total publications</span>
                    <span className="font-semibold text-blue-600">{userGbairais?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Likes reçus</span>
                    <span className="font-semibold text-red-500">{totalLikes}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Commentaires reçus</span>
                    <span className="font-semibold text-green-500">{totalComments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Partages</span>
                    <span className="font-semibold text-purple-500">{totalShares}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 dark:bg-gray-800/90 border-gray-300 dark:border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Informations du compte</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Nom d'utilisateur</span>
                    <p className="font-medium text-gray-900 dark:text-white">{user.username}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                    <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Membre depuis</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDistanceToNow(new Date(user.createdAt || new Date()), { locale: fr })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Liens légaux et informations */}
            <div className="pb-2">
              <Card className="bg-white/90 dark:bg-gray-800/90 border-gray-300 dark:border-gray-700 backdrop-blur-sm mb-64">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Informations légales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Link href="/privacy-policy">
                      <Button variant="ghost" className="w-full justify-start text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                        Politique de confidentialité
                      </Button>
                    </Link>
                    <Link href="/about">
                      <Button variant="ghost" className="w-full justify-start text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                        À propos de Gbairai
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="publications" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Mes Gbairais ({userGbairais?.length || 0})
              </h3>
              <Link href="/create">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau
                </Button>
              </Link>
            </div>

            <div className="pb-24">
              <UserGbairaiManagement 
                gbairais={userGbairais || []} 
                isLoading={isLoading} 
              />
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </MobileLayout>
  );
}