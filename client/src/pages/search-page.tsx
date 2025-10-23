import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, X, MapPin, Clock, Heart, MessageCircle, User, Users } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileLayout } from "@/components/Common/MobileLayout";
import { Gbairai, User as UserType } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { emotionConfig, getEmotionDisplay } from "@/components/Gbairai/GbairaiCard";
import { GbairaiCardMobile } from "@/components/Gbairai/GbairaiCardMobile";

interface SearchFilters {
  searchTerm: string;
  emotion: string;
  location: string;
  dateRange: string;
  sortBy: string;
  hasInteractions: boolean;
}

type SearchType = 'gbairais' | 'users';

export default function SearchPage() {
  const { theme } = useTheme();
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    emotion: '',
    location: '',
    dateRange: '',
    sortBy: 'recent',
    hasInteractions: false
  });
  
  const [searchType, setSearchType] = useState<SearchType>('gbairais');
  const [showFilters, setShowFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Récupérer tous les Gbairais
  const { data: allGbairais = [], isLoading: gbairaisLoading } = useQuery<Gbairai[]>({
    queryKey: ['/api/gbairais'],
  });

  // Récupérer tous les utilisateurs pour la recherche
  const { data: allUsers = [], isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ['/api/users/search', filters.searchTerm],
    queryFn: async () => {
      if (!filters.searchTerm.trim()) {
        return [];
      }
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(filters.searchTerm)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
    enabled: searchType === 'users',
  });

  const isLoading = gbairaisLoading || usersLoading;

  // Fonction pour filtrer les Gbairais
  const filterGbairais = (gbairais: Gbairai[], filters: SearchFilters) => {
    return gbairais.filter(gbairai => {
      // Recherche par mot-clé dans le contenu
      if (filters.searchTerm && !gbairai.content.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }

      // Filtre par émotion
      if (filters.emotion && gbairai.emotion !== filters.emotion) {
        return false;
      }

      // Filtre par localisation
      if (filters.location) {
        const location = gbairai.location as any;
        const locationText = location ? `${location.city || location.region || 'Côte d\'Ivoire'}` : 'Côte d\'Ivoire';
        if (!locationText.toLowerCase().includes(filters.location.toLowerCase())) {
          return false;
        }
      }

      // Filtre par date
      if (filters.dateRange) {
        const now = new Date();
        const gbairaiDate = new Date(gbairai.createdAt!);
        const daysDiff = Math.floor((now.getTime() - gbairaiDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (filters.dateRange) {
          case 'today':
            if (daysDiff > 0) return false;
            break;
          case 'week':
            if (daysDiff > 7) return false;
            break;
          case 'month':
            if (daysDiff > 30) return false;
            break;
        }
      }

      // Filtre par interactions
      if (filters.hasInteractions && (!gbairai.interactions || gbairai.interactions.length === 0)) {
        return false;
      }

      return true;
    });
  };

  // Fonction pour trier les Gbairais
  const sortGbairais = (gbairais: Gbairai[], sortBy: string) => {
    return [...gbairais].sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
        case 'oldest':
          return new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime();
        case 'popular':
          const aLikes = (a.interactions || []).filter(i => i.type === 'like').length;
          const bLikes = (b.interactions || []).filter(i => i.type === 'like').length;
          return bLikes - aLikes;
        case 'comments':
          const aComments = (a.interactions || []).filter(i => i.type === 'comment').length;
          const bComments = (b.interactions || []).filter(i => i.type === 'comment').length;
          return bComments - aComments;
        default:
          return 0;
      }
    });
  };

  // Appliquer les filtres et le tri
  const filteredGbairais = sortGbairais(filterGbairais(allGbairais, filters), filters.sortBy);
  
  // Les utilisateurs sont déjà filtrés côté serveur
  const filteredUsers = allUsers;

  // Détecter si une recherche est active
  useEffect(() => {
    setIsSearching(
      filters.searchTerm.trim() !== '' ||
      filters.emotion !== '' ||
      filters.location !== '' ||
      filters.dateRange !== '' ||
      filters.hasInteractions
    );
  }, [filters]);

  // Effacer tous les filtres
  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      emotion: '',
      location: '',
      dateRange: '',
      sortBy: 'recent',
      hasInteractions: false
    });
  };

  // Obtenir les stats pour l'affichage
  const getInteractionStats = (gbairai: Gbairai) => {
    const interactions = gbairai.interactions || [];
    const likes = interactions.filter(i => i.type === 'like').length;
    const comments = interactions.filter(i => i.type === 'comment').length;
    return { likes, comments };
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 text-text-main dark:text-white">
        {/* Header simple */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-yellow-300 dark:bg-gray-800 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-main dark:text-white">Recherche</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 bg-white/90 border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
            >
              <Filter className="w-4 h-4" />
              Filtres
            </Button>
          </div>

          {/* Filtres étendus */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white/95 rounded-lg border border-yellow-300 dark:bg-gray-800 dark:border-gray-600">
              <div className="grid grid-cols-1 gap-4">
                {/* Filtre par émotion */}
                <div>
                  <Label className="text-sm font-medium mb-2 block text-yellow-800 dark:text-white">Émotion</Label>
                  <Select value={filters.emotion} onValueChange={(value) => setFilters(prev => ({ ...prev, emotion: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les émotions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes les émotions</SelectItem>
                      {Object.entries(emotionConfig).map(([key, emotion]) => (
                        <SelectItem key={key} value={key}>
                          {emotion.emoji} {emotion.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtre par localisation */}
                <div>
                  <Label className="text-sm font-medium mb-2 block text-yellow-800 dark:text-white">Localisation</Label>
                  <Input
                    placeholder="Ville ou région..."
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* Filtre par date */}
                <div>
                  <Label className="text-sm font-medium mb-2 block text-yellow-800 dark:text-white">Période</Label>
                  <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les dates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes les dates</SelectItem>
                      <SelectItem value="today">Aujourd'hui</SelectItem>
                      <SelectItem value="week">Cette semaine</SelectItem>
                      <SelectItem value="month">Ce mois</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtre par interactions */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasInteractions"
                    checked={filters.hasInteractions}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasInteractions: !!checked }))}
                  />
                  <Label htmlFor="hasInteractions" className="text-sm text-yellow-800 dark:text-white">
                    Avec interactions uniquement
                  </Label>
                </div>

                {/* Tri */}
                <div>
                  <Label className="text-sm font-medium mb-2 block text-yellow-800 dark:text-white">Trier par</Label>
                  <Select value={filters.sortBy} onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Plus récents</SelectItem>
                      <SelectItem value="oldest">Plus anciens</SelectItem>
                      <SelectItem value="popular">Plus likés</SelectItem>
                      <SelectItem value="comments">Plus commentés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bouton pour effacer les filtres */}
                {isSearching && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Effacer les filtres
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Indicateur de recherche active */}
          {(isSearching || filters.searchTerm) && (
            <div className="mt-3 flex items-center gap-2 text-sm text-text-secondary dark:text-gray-300">
              <span>
                {searchType === 'gbairais' 
                  ? `${filteredGbairais.length} gbairai${filteredGbairais.length > 1 ? 's' : ''} trouvé${filteredGbairais.length > 1 ? 's' : ''}`
                  : `${filteredUsers.length} utilisateur${filteredUsers.length > 1 ? 's' : ''} trouvé${filteredUsers.length > 1 ? 's' : ''}`
                }
              </span>
              {filters.searchTerm && (
                <Badge variant="secondary" className="text-xs">
                  "{filters.searchTerm}"
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Onglets pour choisir le type de recherche */}
        <div className="px-4 pt-4">
          <Tabs value={searchType} onValueChange={(value) => setSearchType(value as SearchType)}>
            <TabsList className="grid w-full grid-cols-2 bg-white/50 backdrop-blur-md border border-yellow-300 dark:bg-white/10 dark:border-white/20">
              <TabsTrigger value="gbairais" className="flex items-center gap-2 data-[state=active]:bg-yellow-200 text-yellow-800 dark:data-[state=active]:bg-white/20 dark:text-white">
                <MessageCircle className="w-4 h-4" />
                Gbairais
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-yellow-200 text-yellow-800 dark:data-[state=active]:bg-white/20 dark:text-white">
                <Users className="w-4 h-4" />
                Utilisateurs
              </TabsTrigger>
            </TabsList>
            
            {/* Contenu principal */}
            <div className="p-4 pb-32">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <>
                  <TabsContent value="gbairais">
                    {filteredGbairais.length === 0 ? (
                      <div className="text-center py-12">
                        <Search className="w-12 h-12 text-text-secondary dark:text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-yellow-800 dark:text-white mb-2">
                          {isSearching ? 'Aucun gbairai trouvé' : 'Recherchez des Gbairais'}
                        </h3>
                        <p className="text-yellow-700 dark:text-gray-400">
                          {isSearching 
                            ? 'Essayez avec des mots-clés différents ou ajustez vos filtres'
                            : 'Utilisez la barre de recherche pour trouver des Gbairais spécifiques'
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredGbairais.map((gbairai) => {
                          return (
                            <div key={gbairai.id} className="mb-4">
                              <GbairaiCardMobile 
                                gbairai={gbairai}
                                onCommentsToggle={() => {}}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="users">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-text-secondary dark:text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-yellow-800 dark:text-white mb-2">
                          {filters.searchTerm ? 'Aucun utilisateur trouvé' : 'Recherchez des utilisateurs'}
                        </h3>
                        <p className="text-yellow-700 dark:text-gray-400">
                          {filters.searchTerm 
                            ? 'Aucun utilisateur ne correspond à votre recherche'
                            : 'Tapez un nom d\'utilisateur ou une adresse email pour rechercher'
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredUsers.map((user) => (
                          <Card key={user.id} className="bg-white/90 backdrop-blur-md border border-yellow-300 dark:bg-white/10 dark:border-white/20">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                  <User className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-medium text-yellow-800 dark:text-white">{user.username}</h3>
                                  <p className="text-sm text-yellow-700 dark:text-gray-400">
                                    Membre depuis {formatDistanceToNow(new Date(user.createdAt!), { addSuffix: true, locale: fr })}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-1">
                                      <Users className="w-4 h-4 text-text-secondary dark:text-gray-400" />
                                      <span className="text-sm text-yellow-700 dark:text-gray-300">{user.followersCount || 0} followers</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MessageCircle className="w-4 h-4 text-yellow-700 dark:text-gray-400" />
                                      <span className="text-sm text-yellow-700 dark:text-gray-300">{user.gbairaisCount || 0} gbairais</span>
                                    </div>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-yellow-800 hover:bg-yellow-100 dark:text-white dark:hover:bg-white/20"
                                  onClick={() => window.location.href = `/profile/${user.id}`}
                                >
                                  Voir le profil
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </div>

        {/* Barre de recherche en bas - Style glassmorphism */}
        <div className="fixed bottom-20 left-0 right-0 z-40 p-4 safe-area-pb">
          <div className="max-w-md mx-auto">
            <div className="relative">
              {/* Ombre colorée pour l'effet glassmorphism */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 opacity-30 dark:opacity-60 blur-2xl rounded-3xl transform scale-105"></div>
              
              {/* Container principal avec effet glassmorphism */}
              <div className="relative bg-black/80 backdrop-blur-md border border-gray-600 rounded-3xl p-3 shadow-2xl transform hover:scale-105 transition-transform duration-300 dark:bg-white/10 dark:border-white/20">
                <div className="flex items-center gap-3">
                  {/* Bouton de recherche */}
                  <button className="flex-shrink-0 bg-gray-700/50 hover:bg-gray-600/50 transition-colors duration-200 rounded-xl p-2 dark:bg-white/20 dark:hover:bg-white/30">
                    <Search className="w-5 h-5 text-white dark:text-white" />
                  </button>
                  
                  {/* Input de recherche */}
                  <input
                    type="text"
                    placeholder={searchType === 'gbairais' ? "Rechercher dans les Gbairais..." : "Rechercher des utilisateurs..."}
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-300 text-base dark:text-white dark:placeholder-white/70"
                  />
                  
                  {/* Bouton clear */}
                  {filters.searchTerm && (
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, searchTerm: '' }))}
                      className="flex-shrink-0 bg-gray-700/50 hover:bg-gray-600/50 transition-colors duration-200 rounded-xl p-2 dark:bg-white/20 dark:hover:bg-white/30"
                    >
                      <X className="w-5 h-5 text-white dark:text-white" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}