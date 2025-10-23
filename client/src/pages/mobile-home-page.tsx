import React, { useState, useEffect, useMemo, useRef } from "react";
import { MobileLayout } from "@/components/Common/MobileLayout";
import { GbairaiCardMobile } from "@/components/Gbairai/GbairaiCardMobile";
import { GbairaiFilters } from "@/components/Common/GbairaiFilters";
import { useGbairais, useGbairaiComments } from "@/hooks/useGbairais";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Heart, User, Bell, LogIn, UserPlus, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InteractiveMap } from "@/components/Map/InteractiveMap";
import { GbairaiForm } from "@/components/Gbairai/GbairaiForm";

export default function MobileHomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  // Charger les filtres depuis localStorage au démarrage
  const loadFiltersFromStorage = () => {
    try {
      const savedFilters = localStorage.getItem('gbairai-filters');
      if (savedFilters) {
        return JSON.parse(savedFilters);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des filtres:', error);
    }
    return {
      region: undefined,
      followingOnly: false,
      emotion: undefined,
      location: undefined,
    };
  };

  // Tous les hooks d'état d'abord
  const [filters, setFilters] = useState(loadFiltersFromStorage);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 16, y: typeof window !== 'undefined' ? window.innerHeight * 0.85 : 600 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(() => {
    // Vérifier si le banner a été masqué précédemment
    try {
      const hidden = localStorage.getItem('welcome-banner-hidden');
      return hidden !== 'true';
    } catch {
      return true;
    }
  });

  // Hooks personnalisés
  const [location, setLocation] = useLocation();

  // Refs
  const commentBoxRef = useRef<HTMLDivElement>(null);

  // Queries React Query
  const { data: gbairais, isLoading, refetch } = useGbairais(filters);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getNotifications,
    enabled: !!user,
    refetchInterval: 10000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Get comments for the current gbairai - toujours appeler ce hook AVANT le calcul de currentGbairai
  const currentGbairai = useMemo(() => gbairais?.[currentIndex], [gbairais, currentIndex]);
  const { data: currentComments = [] } = useGbairaiComments(currentGbairai?.id || 0);

  // Variables dérivées
  const unreadCount = notifications.filter(n => !n.read).length;

  // Fonction pour gérer les actions nécessitant une authentification
  const handleAuthRequired = () => {
    setShowAuthDialog(true);
  };

  // Fonction pour gérer les changements de filtres
  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    // Sauvegarder les filtres dans localStorage
    try {
      localStorage.setItem('gbairai-filters', JSON.stringify(newFilters));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des filtres:', error);
    }
  };

  // Fonction pour masquer le banner de bienvenue
  const handleHideWelcomeBanner = () => {
    setShowWelcomeBanner(false);
    try {
      localStorage.setItem('welcome-banner-hidden', 'true');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  // Tous les useEffect ensemble
  // Auto-refresh when app comes back to foreground
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch]);

  // Check for old-style gbairai parameter and redirect to new page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gbairaiId = urlParams.get('gbairai');
    if (gbairaiId) {
      // Redirect to new page structure
      setLocation(`/gbairai/${gbairaiId}`);
    }
  }, [setLocation]);

  // Reset to first gbairai when data changes
  useEffect(() => {
    if (gbairais && gbairais.length > 0) {
      setCurrentIndex(0);
    }
  }, [gbairais]);

  // Fonctions de gestion des événements de drag/drop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!commentBoxRef.current) return;
    setIsDragging(true);
    const rect = commentBoxRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!commentBoxRef.current) return;
    setIsDragging(true);
    const touch = e.touches[0];
    const rect = commentBoxRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 150, e.clientY - dragOffset.y));
    setDragPosition({ x: newX, y: newY });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const newX = Math.max(0, Math.min(window.innerWidth - 320, touch.clientX - dragOffset.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 150, touch.clientY - dragOffset.y));
    setDragPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Event listeners pour le drag/drop
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragOffset]);

  // Mémorisations et calculs
  const filteredGbairais = useMemo(() => {
    let filtered = gbairais || [];

    if (filters.location && filters.location.city) {
      filtered = filtered.filter(gbairai => {
        return gbairai.location?.city === filters.location.city;
      });
    }

    return filtered;
  }, [gbairais, filters]);

  // Get the main comment with most likes (not a reply)
  const getTopComment = () => {
    if (!currentComments || currentComments.length === 0 || !currentGbairai) return null;

    const mainComments = currentComments.filter((comment: any) => !comment.parentCommentId);
    if (mainComments.length === 0) return null;

    // Function to count likes for a specific comment using gbairai interactions
    const getCommentLikesCount = (commentId: number) => {
      if (!currentGbairai.interactions) return 0;
      return currentGbairai.interactions.filter((interaction: any) => 
        interaction.type === 'like' && 
        interaction.parentCommentId === commentId
      ).length;
    };

    // Sort comments by number of likes, then by creation date
    const sortedComments = mainComments
      .map((comment: any) => ({
        ...comment,
        likesCount: getCommentLikesCount(comment.id)
      }))
      .sort((a: any, b: any) => {
        if (a.likesCount !== b.likesCount) {
          return b.likesCount - a.likesCount; // Most liked first
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Most recent first
      });

    return sortedComments[0];
  };

  const topComment = getTopComment();

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Block scroll navigation if comments are open
    if (isCommentsOpen) {
      return;
    }

    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / containerHeight);

    if (newIndex !== currentIndex && gbairais && newIndex < gbairais.length) {
      setCurrentIndex(newIndex);
    }
  };

  if (authLoading) {
    return (
      <MobileLayout showTopButtons={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="space-y-4 text-center">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout className="p-0" showTopButtons={false}>
      {/* Main Content */}
      <div className="h-full relative flex justify-center bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700" style={{ 
        alignItems: 'center', 
        paddingTop: '10vh'
      }}>
        {/* Banner pour les visiteurs non connectés */}
        {!user && showWelcomeBanner && (
          <div className="fixed left-0 right-0 z-50 pt-20 md:pt-8 px-6 md:px-12" style={{ top: '0%', background: 'transparent' }}>
            <div className="flex justify-end items-start mb-4">
            </div>
            <div className="space-y-6">
              <div className="space-y-6">
                <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHideWelcomeBanner}
                    className="absolute top-2 right-2 h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-200/50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <CardContent className="p-4 text-center">
                    <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                      🎉 Bienvenue sur Gbairai !
                    </h2>
                    <p className="text-blue-700 dark:text-blue-300 mb-4 text-sm">
                      Découvrez les émotions et actualités de la Côte d'Ivoire en temps réel. 
                      Créez votre compte en 30 secondes pour participer !
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Link href="/auth">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Créer un compte
                        </Button>
                      </Link>
                      <Link href="/auth">
                        <Button variant="outline" size="sm" className="border-blue-300 text-blue-700">
                          <LogIn className="w-4 h-4 mr-2" />
                          Se connecter
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="fixed left-0 right-0 z-50 pt-20 md:pt-8 px-6 md:px-12" style={{ top: (!user && showWelcomeBanner ? '15%' : '-30%'), background: 'transparent' }}>
          <div className="flex justify-end items-start mb-4">
            <div className="flex space-x-2">
              {user ? (
                <>
                  <Link href="/messages">
                    <Button size="sm" variant="outline" className="bg-white/95 backdrop-blur-sm border-yellow-300 shadow-lg hover:bg-white text-yellow-700">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </Link>

                  <Link href="/notifications">
                    <Button size="sm" variant="outline" className="bg-white/95 backdrop-blur-sm border-yellow-300 shadow-lg hover:bg-white text-yellow-700 relative">
                      <Bell className="w-4 h-4" />
                      {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center p-0">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          <GbairaiFilters 
            currentFilters={filters}
            onFilterChange={handleFilterChange}
            hideWhenCommentsOpen={isCommentsOpen}
          />
        </div>

        {/* Gbairai Container - Rectangle with scroll snap */}
        <div 
          className="scroll-snap-container"
          onScroll={handleScroll}
          style={{ 
            scrollBehavior: 'smooth',
            overscrollBehavior: 'none',
            scrollSnapStop: 'always',
            overflow: isCommentsOpen ? 'hidden' : 'auto',
            paddingTop: '120px' // Space for fixed filters
          }}
        >
          {filteredGbairais.map((gbairai, index) => (
            <div 
              key={gbairai.id}
              className="scroll-snap-item"
            >
              <div className="w-full max-w-lg">
                <GbairaiCardMobile 
                  gbairai={gbairai} 
                  onCommentsToggle={setIsCommentsOpen}
                />
              </div>
            </div>
          ))}

          {/* Create Button Screen */}
          <div className="scroll-snap-item">
            <div className="text-center">
              <div className="text-gray-400 mb-8">
                <Plus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Créer un nouveau Gbairai</h3>
                <p className="text-sm">Partagez votre histoire avec la communauté</p>
              </div>
              <Link href="/create">
                <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-8 py-3 text-lg font-semibold">
                  <Plus className="w-5 h-5 mr-2" />
                  Gbairai
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll Indicator - Positioned relative to container - TAILLE RÉDUITE */}
        <div className="absolute right-4 z-10" style={{ top: 'calc(50% + 5vh)', transform: 'translateY(-50%)' }}>
          <div className="flex flex-col space-y-1 bg-white/20 backdrop-blur-sm rounded-full p-1">
            {filteredGbairais.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors shadow-sm ${
                  index === currentIndex ? 'bg-yellow-600 shadow-lg' : 'bg-white/60 border border-yellow-300'
                }`}
              />
            ))}
            <div className={`w-2 h-2 rounded-full transition-colors shadow-sm ${
              currentIndex === filteredGbairais.length ? 'bg-yellow-600 shadow-lg' : 'bg-white/60 border border-yellow-300'
            }`} />
          </div>
        </div>

        {/* Top Comment Display - Draggable section */}
        {!isCommentsOpen && (
          <div 
            ref={commentBoxRef}
            className="absolute z-20 cursor-move select-none"
            style={{ 
              left: `${dragPosition.x}px`,
              top: `${dragPosition.y}px`,
              transform: 'scale(0.7)', // Réduction de 30%
              transformOrigin: 'top left'
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
          <div className="bg-black/70 backdrop-blur-lg rounded-xl border border-ivorian-orange/20 p-4 max-w-sm">
            {topComment ? (
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-ivorian-orange/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-ivorian-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-base font-medium text-white">
                      {topComment.user?.username || 'Utilisateur'}
                    </span>
                    <span className="text-sm text-gray-300">
                      {formatDistanceToNow(new Date(topComment.createdAt), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </span>
                  </div>
                  <p className="text-base text-gray-100 leading-relaxed">
                    {topComment.content}
                  </p>
                  <div className="flex items-center space-x-2 mt-3">
                    <div className="flex items-center space-x-1 text-ivorian-orange">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">{topComment.likesCount || 0}</span>
                    </div>
                    <span className="text-sm text-gray-400">Commentaire top</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-base text-gray-300">
                    Aucun commentaire pour le moment
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Dialog d'invitation à l'inscription */}
        <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
          <DialogContent className="bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-bold text-blue-600">
                🚀 Rejoignez Gbairai !
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  ⚡ <strong>Inscription ultra-rapide :</strong> 30 secondes chrono !
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Partagez vos émotions et découvertes</li>
                  <li>• Interagissez avec la communauté</li>
                  <li>• Accédez à toutes les fonctionnalités</li>
                  <li>• Carte interactive complète</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Link href="/auth">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => setShowAuthDialog(false)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Créer mon compte (30 sec)
                  </Button>
                </Link>
                <Link href="/auth">
                  <Button variant="outline" className="w-full" onClick={() => setShowAuthDialog(false)}>
                    <LogIn className="w-4 h-4 mr-2" />
                    J'ai déjà un compte
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAuthDialog(false)}
                  className="text-gray-500"
                >
                  Continuer en tant que visiteur
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}