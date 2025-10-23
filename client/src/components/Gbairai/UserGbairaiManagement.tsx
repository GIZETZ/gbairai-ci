import { useState } from "react";
import { useDeleteGbairai } from "@/hooks/useGbairais";
import { GbairaiCardMobile } from "./GbairaiCardMobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Trash2, 
  Edit3, 
  MoreVertical,
  AlertTriangle,
  Plus,
  Heart,
  Share2,
  Calendar
} from "lucide-react";
import { GbairaiWithInteractions } from "@shared/schema";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface UserGbairaiManagementProps {
  gbairais: GbairaiWithInteractions[];
  isLoading: boolean;
}

export function UserGbairaiManagement({ gbairais, isLoading }: UserGbairaiManagementProps) {
  const [selectedGbairai, setSelectedGbairai] = useState<GbairaiWithInteractions | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteGbairai = useDeleteGbairai();
  const { toast } = useToast();

  const handleDelete = (gbairai: GbairaiWithInteractions) => {
    setSelectedGbairai(gbairai);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedGbairai) {
      deleteGbairai.mutate(selectedGbairai.id);
      setShowDeleteDialog(false);
      setSelectedGbairai(null);
    }
  };

  const getEmotionColor = (emotion: string) => {
    const colors = {
      'joie': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      'tristesse': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      'colère': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
      'calme': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      'suspens': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      'enjaillé': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
      'amour': 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300',
      'goumin': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
      'nerveux': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300',
      'inclassable': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    };
    return colors[emotion as keyof typeof colors] || colors.inclassable;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="bg-gray-50 dark:bg-gray-800">
            <CardContent className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!gbairais || gbairais.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50 text-gray-400" />
        <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">
          Aucun Gbairai
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Vous n'avez pas encore publié de Gbairai
        </p>
        <Link href="/create">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Créer mon premier Gbairai
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {gbairais.map((gbairai) => (
          <Card key={gbairai.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              {/* Header avec actions */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Badge className={getEmotionColor(gbairai.emotion)}>
                    {gbairai.emotion}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {formatDistanceToNow(new Date(gbairai.createdAt), { addSuffix: true, locale: fr })}
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-gray-900 dark:text-white">
                        Actions sur le Gbairai
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => handleDelete(gbairai)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer ce Gbairai
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Contenu */}
              <div className="mb-3">
                <p className="text-gray-900 dark:text-white leading-relaxed">
                  {gbairai.content}
                </p>
              </div>

              {/* Localisation */}
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                📍 {gbairai.location.city}, {gbairai.location.region}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  <span>{gbairai.likesCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{gbairai.commentsCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Share2 className="w-4 h-4" />
                  <span>{gbairai.sharesCount}</span>
                </div>
              </div>

              {/* Anonymat */}
              {gbairai.isAnonymous && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    Publié anonymement
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de suppression */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Supprimer le Gbairai
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Êtes-vous sûr de vouloir supprimer ce Gbairai ? Cette action est irréversible.
            </p>
            {selectedGbairai && (
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                  "{selectedGbairai.content.substring(0, 100)}
                  {selectedGbairai.content.length > 100 ? '...' : ''}"
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteGbairai.isPending}
                className="flex-1"
              >
                {deleteGbairai.isPending ? (
                  "Suppression..."
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}