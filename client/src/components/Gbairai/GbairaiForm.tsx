import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "@/hooks/useLocation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { EmotionSelector } from "./EmotionSelector";
import { LocationSelector } from "./LocationSelector";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MapPin, Loader2 } from "lucide-react";
import { EmotionSuggestion } from "@shared/schema";

interface GbairaiFormProps {
  onSuccess?: () => void;
}

export function GbairaiForm({ onSuccess }: GbairaiFormProps) {
  const { user } = useAuth();
  const { location } = useLocation();
  const { toast } = useToast();
  
  const [content, setContent] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [customEmotion, setCustomEmotion] = useState<string>("");
  const [customEmotionDescription, setCustomEmotionDescription] = useState<string>("");
  const [customEmoji, setCustomEmoji] = useState<string>("🎨");
  const [suggestedEmotions, setSuggestedEmotions] = useState<EmotionSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{city: string; region: string; country: string} | null>(
    location ? { city: location.city || "Abidjan", region: location.region || "Abidjan", country: "Côte d'Ivoire" } : null
  );

  // Analyser le contenu avec l'IA
  useEffect(() => {
    const analyzeContent = async () => {
      if (content.length < 10) {
        setSuggestedEmotions([]);
        return;
      }

      setIsAnalyzing(true);
      try {
        const response = await fetch("/api/analyze-emotion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content, language: "fr-ci" }),
        });

        if (response.ok) {
          const result = await response.json();
          setSuggestedEmotions(result.suggestions || []);
          
          // Auto-sélection si confiance élevée
          if (result.suggestions?.[0]?.confidence > 0.8) {
            setSelectedEmotion(result.suggestions[0].emotion);
          }
        }
      } catch (error) {
        console.error("Erreur analyse:", error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    const timeoutId = setTimeout(analyzeContent, 500);
    return () => clearTimeout(timeoutId);
  }, [content]);

  const handleCustomEmotion = (emotion: string, description: string, emoji: string) => {
    setCustomEmotion(emotion);
    setCustomEmotionDescription(description);
    setCustomEmoji(emoji || "🎨");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || !selectedEmotion) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      });
      return;
    }

    if (!selectedLocation) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une localisation",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/gbairais", {
        content: content.trim(),
        emotion: selectedEmotion === 'Personalisé' ? `custom:${customEmotion}` : selectedEmotion,
        location: {
          latitude: location?.latitude || 7.539989,
          longitude: location?.longitude || -5.54708,
          city: selectedLocation.city,
          region: selectedLocation.region,
          country: selectedLocation.country,
        },
        isAnonymous,
        metadata: {
          suggestedEmotions,
          userSelected: selectedEmotion !== suggestedEmotions[0]?.emotion,
          customEmotionDescription: selectedEmotion === 'Personalisé' ? customEmotionDescription : undefined,
          customEmoji: selectedEmotion === 'Personalisé' ? customEmoji : undefined,
        },
      });

      // Invalider le cache pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["/api/gbairais"] });

      toast({
        title: "Succès",
        description: "Gbairai publié avec succès !",
      });

      // Réinitialiser le formulaire
      setContent("");
      setSelectedEmotion(null);
      setCustomEmotion("");
      setCustomEmotionDescription("");
      setCustomEmoji("🎨");
      setSuggestedEmotions([]);
      
      onSuccess?.();
    } catch (error: any) {
      console.error("Erreur publication:", error);
      
      // Gestion spécifique des erreurs de modération
      if (error.response?.status === 400 && error.response?.data?.error === 'Contenu modéré') {
        toast({
          title: "Contenu modéré",
          description: error.response.data.message || "Contenu non autorisé",
          variant: "destructive",
        });
      } else if (error.response?.data?.message) {
        toast({
          title: "Erreur",
          description: error.response.data.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Erreur lors de la publication",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = content.length;
  const isValid = content.trim() && selectedEmotion && selectedLocation && characterCount <= 280;

  return (
    <Card className="bg-white/95 dark:bg-gray-800 border-yellow-300 dark:border-gray-700">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Zone de texte principale */}
          <div className="relative">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ya quel gbairai encore..."
              className="min-h-24 resize-none pr-20 bg-yellow-50 dark:bg-gray-700 border-yellow-300 dark:border-gray-600 text-yellow-900 dark:text-white placeholder:text-yellow-600 dark:placeholder:text-gray-300"
              maxLength={280}
            />
            
            {/* Compteur de caractères */}
            <div className="absolute bottom-2 right-2 text-sm text-yellow-600 dark:text-gray-300">
              {characterCount}/280
            </div>
            
            {/* Indicateur d'analyse */}
            {isAnalyzing && (
              <div className="absolute top-2 right-2">
                <Loader2 className="h-4 w-4 animate-spin text-ivorian-orange" />
              </div>
            )}
          </div>

          {/* Sélecteur d'émotion */}
          <div>
            <Label className="text-sm font-medium text-yellow-800 dark:text-white mb-2 block">
              Émotion {isAnalyzing && "(analyse en cours...)"}
            </Label>
            <EmotionSelector
              selectedEmotion={selectedEmotion}
              onEmotionSelect={setSelectedEmotion}
              suggestions={suggestedEmotions}
              isAnalyzing={isAnalyzing}
              customEmotion={customEmotion}
              customEmoji={customEmoji}
              onCustomEmotion={handleCustomEmotion}
            />
          </div>

          {/* Localisation */}
          <LocationSelector
            selectedLocation={selectedLocation}
            onLocationSelect={setSelectedLocation}
          />

          {/* Options */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
              className="border-yellow-400 dark:border-gray-600 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600 dark:data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-600"
            />
            <Label
              htmlFor="anonymous"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-yellow-800 dark:text-white"
            >
              Publication anonyme
            </Label>
          </div>

          {/* Bouton de soumission */}
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full bg-ivorian-orange hover:bg-orange-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publication...
              </>
            ) : (
              "Publier le Gbairai"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
