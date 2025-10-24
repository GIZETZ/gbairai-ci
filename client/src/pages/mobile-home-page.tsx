import React, { useState, useEffect, useMemo, useRef } from "react";
import { MobileLayout } from "@/components/Common/MobileLayout";
import { GbairaiCardMobile } from "@/components/Gbairai/GbairaiCardMobile";
import { GbairaiFilters } from "@/components/Common/GbairaiFilters";
import { useGbairais, useGbairaiComments } from "@/hooks/useGbairais";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Heart, User, Bell, LogIn, UserPlus, X, Download } from "lucide-react";
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
  const [currentIndex, setCurrentIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('gbairai-current-index');
      const n = saved != null ? Number(saved) : 0;
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
    }
  });

  // PWA install prompt handling
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);
  const [isIosEnv, setIsIosEnv] = useState<boolean>(false);

  const isAppInstalled = () => {
    try {
      const standalone = (window.navigator as any).standalone;
      const displayMode = window.matchMedia('(display-mode: standalone)').matches;
      return !!standalone || displayMode;
    } catch {
      return false;
    }
  };

  const isIos = () => {
    try {
      const ua = window.navigator.userAgent || '';
      return /iPhone|iPad|iPod/i.test(ua);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
    setIsIosEnv(isIos());
    const checkInstalledAndMaybeShow = () => {
      const installed = isAppInstalled();
      const canPrompt = !!deferredPrompt;
      const shouldShow = !installed && !dismissed && (canPrompt || isIos());
      setShowInstallBanner(shouldShow);
    };

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissedNow = localStorage.getItem('pwa-install-dismissed') === 'true';
      if (!isAppInstalled() && !dismissedNow) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    checkInstalledAndMaybeShow();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    try {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    } catch {}
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    try { localStorage.setItem('pwa-install-dismissed', 'true'); } catch {}
  };

  const [logoVisible, setLogoVisible] = useState(true);
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
  const unreadCount = notifications.filter((n: any) => !n.read).length;

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

  // Clamp index when data changes, do not reset progress
  useEffect(() => {
    if (!gbairais || gbairais.length === 0) return;
    setCurrentIndex(prev => {
      if (prev < 0) return 0;
      if (prev >= gbairais.length) return gbairais.length - 1;
      return prev;
    });
  }, [gbairais]);

  // Persist current index
  useEffect(() => {
    try { localStorage.setItem('gbairai-current-index', String(currentIndex)); } catch {}
  }, [currentIndex]);

  // Keep scroll position in sync with currentIndex
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const targetTop = currentIndex * el.clientHeight;
    if (Math.abs(el.scrollTop - targetTop) > 1) {
      el.scrollTo({ top: targetTop, behavior: 'instant' as any });
    }
  }, [currentIndex, gbairais]);

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

    if (filters.location && (filters.location as any).city) {
      filtered = filtered.filter(gbairai => {
        return (gbairai as any).location?.city === (filters.location as any).city;
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
    <MobileLayout 
      className="p-0" 
      showTopButtons={false}
      renderRightExtras={
        <GbairaiFilters 
          currentFilters={filters}
          onFilterChange={handleFilterChange}
          hideWhenCommentsOpen={isCommentsOpen}
          headerPlacement
        />
      }
    >
      {/* Main Content */}
      <div className="h-full relative flex justify-center bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-300 dark:bg-background dark:text-foreground" style={{ 
        alignItems: 'center', 
        paddingTop: '10vh'
      }}>
        {/* Modal d'installation PWA centré */}
        {showInstallBanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={handleDismissInstall} />
            <Card className="relative z-10 w-[92%] max-w-sm border-2 border-yellow-300 bg-white/95 dark:bg-gray-900/90 shadow-xl">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismissInstall}
                className="absolute top-2 right-2 h-6 w-6 p-0 text-yellow-700 hover:text-yellow-900 hover:bg-yellow-200/50"
              >
                <X className="w-4 h-4" />
              </Button>
              <CardContent className="p-5 text-center">
                {logoVisible && (
                  <img
                    src="/logo.png"
                    alt="Gbairai"
                    className="mx-auto mb-3 h-10 w-10 object-contain"
                    onError={() => setLogoVisible(false)}
                  />
                )}
                {deferredPrompt ? (
                  <>
                    <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                      Installer l'application Gbairai
                    </h2>
                    <p className="text-yellow-700 dark:text-yellow-300 mb-4 text-sm">
                      Accédez à Gbairai plus rapidement depuis votre écran d'accueil et profitez d'une meilleure expérience.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={handleInstallClick}>
                        <Download className="w-4 h-4 mr-2" />
                        Installer
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                      Ajouter à l'écran d'accueil (iOS)
                    </h2>
                    <div className="text-yellow-700 dark:text-yellow-300 mb-3 text-sm space-y-1 text-left">
                      <p>1. Ouvrez le menu partage (icône carré avec flèche).</p>
                      <p>2. Choisissez « Ajouter à l'écran d'accueil ».</p>
                      <p>3. Confirmez pour installer Gbairai.</p>
                    </div>
                    <div className="text-xs text-muted-foreground mb-4">
                      Astuce: si l'option n'apparaît pas, faites défiler les actions.
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" variant="outline" onClick={handleDismissInstall}>
                        J'ai compris
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters moved to header via renderBelowSubtitle */}

        {/* Gbairai Container - Rectangle with scroll snap */}
        <div 
          className="scroll-snap-container"
          onScroll={handleScroll}
          style={{ 
            scrollBehavior: 'smooth',
            overscrollBehavior: 'none',
            scrollSnapStop: 'always',
            overflow: isCommentsOpen ? 'hidden' : 'auto',
            paddingTop: '96px'
          }}
          ref={scrollContainerRef}
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