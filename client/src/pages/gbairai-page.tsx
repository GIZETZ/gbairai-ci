import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { GbairaiWithInteractions } from "@shared/schema";
import { GbairaiCardMobile } from "@/components/Gbairai/GbairaiCardMobile";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { Link } from "wouter";

export default function GbairaiPage() {
  const { user } = useAuth();
  const params = useParams();
  const gbairaiId = parseInt(params.id as string);
  const [, setLocation] = useLocation();

  // Récupérer les données du Gbairai spécifique
  const { data: gbairai, isLoading, error } = useQuery<GbairaiWithInteractions>({
    queryKey: ['/api/gbairais', gbairaiId],
    enabled: !!gbairaiId,
  });

  // Rediriger vers la page d'accueil si l'ID n'est pas valide
  useEffect(() => {
    if (!gbairaiId || isNaN(gbairaiId)) {
      setLocation('/');
    }
  }, [gbairaiId, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Chargement du Gbairai...</p>
        </div>
      </div>
    );
  }

  if (error || !gbairai) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-xl font-semibold mb-2">Gbairai non trouvé</h1>
          <p className="text-gray-400 mb-6">Ce Gbairai n'existe pas ou n'est plus disponible.</p>
          <Link href="/">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Home className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-white font-semibold">Gbairai</h1>
              <p className="text-gray-400 text-sm">
                {gbairai.user && !gbairai.isAnonymous 
                  ? `Par ${gbairai.user.username}` 
                  : 'Publication anonyme'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gbairai content - même style que la page d'accueil */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="gbairai-container" style={{
            width: '100%',
            height: '600px',
            borderRadius: '20px',
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <GbairaiCardMobile 
              gbairai={gbairai}
              onCommentsToggle={() => {}}
            />
          </div>
        </div>
      </div>

      {/* Footer avec informations supplémentaires */}
      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-md mx-auto">
          <div className="bg-gray-900/50 rounded-lg p-4 border border-white/10">
            <h3 className="text-white font-medium mb-2">À propos de ce Gbairai</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <div>
                <span className="font-medium">Créé le:</span> {' '}
                {new Date(gbairai.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div>
                <span className="font-medium">Interactions:</span> {' '}
                {gbairai.likesCount} j'aime, {gbairai.commentsCount} commentaires, {gbairai.sharesCount} partages
              </div>
              {gbairai.location && (
                <div>
                  <span className="font-medium">Localisation:</span> {' '}
                  {typeof gbairai.location === 'object' 
                    ? `${gbairai.location.city || ''}, ${gbairai.location.region || ''}`
                    : gbairai.location
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}