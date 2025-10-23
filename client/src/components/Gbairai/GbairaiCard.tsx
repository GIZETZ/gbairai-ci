import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GbairaiWithInteractions } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MapPin, 
  Loader2,
  MoreVertical,
  Send
} from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareToConversationModal } from "./ShareToConversationModal";

interface GbairaiCardProps {
  gbairai: GbairaiWithInteractions;
  compact?: boolean;
  highlighted?: boolean;
}

export const emotionConfig = {
  "enjaillé": { emoji: "😊", color: "bg-yellow-100", label: "Enjaillé" },
  "nerveux": { emoji: "😠", color: "bg-red-100", label: "Nerveux" },
  "goumin": { emoji: "😢", color: "bg-blue-100", label: "Goumin" },
  "trop fan": { emoji: "❤️", color: "bg-pink-100", label: "Trop Fan" },
  "Mais Ahy?": { emoji: "🤔", color: "bg-purple-100", label: "Mais Ahy?" },
  "Légé": { emoji: "😌", color: "bg-green-100", label: "Légé" },
  "inclassable": { emoji: "🎨", color: "bg-orange-100", label: "Inclassable" },
};

export const getEmotionDisplay = (emotion: string) => {
  if (emotion.startsWith('custom:')) {
    const customEmotion = emotion.replace('custom:', '');
    return { emoji: "🎨", color: "bg-orange-100", label: customEmotion };
  }
  return emotionConfig[emotion as keyof typeof emotionConfig] || emotionConfig.inclassable;
};

export function GbairaiCard({ gbairai, compact = false, highlighted = false }: GbairaiCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const emotion = getEmotionDisplay(gbairai.emotion);
  const userHasLiked = gbairai.interactions.some(
    (interaction) => interaction.userId === user?.id && interaction.type === "like"
  );

  const timeAgo = formatDistanceToNow(new Date(gbairai.createdAt!), {
    addSuffix: true,
    locale: fr,
  });

  const location = gbairai.location as any;
  const locationText = location?.city || location?.region || "Lieu inconnu";

  const handleLike = async () => {
    if (!user) return;

    setIsLiking(true);
    try {
      await apiRequest("POST", `/api/gbairais/${gbairai.id}/interact`, {
        type: "like",
      });

      // Invalider le cache pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["/api/gbairais"] });

      toast({
        title: userHasLiked ? "Like retiré" : "Like ajouté",
        description: userHasLiked ? "Vous n'aimez plus ce gbairai" : "Vous aimez ce gbairai",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'interaction",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!user || gbairai.userId !== user.id) return;

    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/gbairais/${gbairai.id}`);

      // Invalider le cache pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["/api/gbairais"] });

      toast({
        title: "Gbairai supprimé",
        description: "Votre gbairai a été supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/gbairai/${gbairai.id}`;
    
    // Essayer d'utiliser l'API Web Share si disponible
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Gbairai',
          text: `Découvrez ce Gbairai: "${gbairai.content}"`,
          url: shareUrl
        });
        return;
      } catch (error) {
        // L'utilisateur a annulé le partage, continuer avec la copie
      }
    }
    
    // Fallback: copier le lien
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Lien copié",
        description: "Le lien du Gbairai a été copié dans le presse-papier"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className={`${compact ? 'border-l-4' : ''} border-l-${emotion.color.replace('bg-', '')} ${highlighted ? 'ring-2 ring-primary shadow-lg' : ''}`}>
      <CardContent className="p-6 bg-[#23252f]">
        <div className="flex items-start space-x-3">
          {/* Avatar/Emotion */}
          <div className={`w-8 h-8 ${emotion.color} rounded-full flex items-center justify-center flex-shrink-0`}>
            <span className="text-white text-sm">{emotion.emoji}</span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">
                  {gbairai.isAnonymous ? "Utilisateur anonyme" : gbairai.user?.username || "Utilisateur"}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {emotion.label}
                </Badge>
                <span className="text-xs text-gray-500">• {timeAgo}</span>
              </div>
              
              {/* Actions Menu */}
              {user && gbairai.userId === user.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-red-600"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Suppression...
                        </>
                      ) : (
                        "Supprimer"
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Content */}
            <div className="mb-3 text-[#f5f5f5] text-[30px] text-center" style={{ 
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '120px',
              fontSize: '30px',
              fontWeight: '600'
            }}>
              {gbairai.content}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>{locationText}</span>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  disabled={isLiking || !user}
                  className={`h-6 px-2 ${userHasLiked ? 'text-red-500' : 'text-gray-500'} hover:text-red-600`}
                >
                  {isLiking ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Heart className={`h-3 w-3 ${userHasLiked ? 'fill-current' : ''}`} />
                  )}
                  <span className="ml-1">{gbairai.likesCount}</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-gray-500 hover:text-blue-600"
                >
                  <MessageCircle className="h-3 w-3" />
                  <span className="ml-1">{gbairai.commentsCount}</span>
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-gray-500 hover:text-green-600"
                    >
                      <Share2 className="h-3 w-3" />
                      <span className="ml-1">{gbairai.sharesCount}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    style={{
                      zIndex: 9999
                    }}
                  >
                    <DropdownMenuItem 
                      onClick={handleShare}
                      className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Partager le lien
                    </DropdownMenuItem>
                    <ShareToConversationModal 
                      gbairaiId={gbairai.id} 
                      gbairaiContent={gbairai.content}
                      trigger={
                        <DropdownMenuItem 
                          onSelect={(e) => e.preventDefault()}
                          className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Partager dans une discussion
                        </DropdownMenuItem>
                      }
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
