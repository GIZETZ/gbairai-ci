import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Sparkles, Type } from "lucide-react";

interface CustomEmotionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (emotion: string, description: string) => void;
}

export function CustomEmotionEditor({ isOpen, onClose, onSave }: CustomEmotionEditorProps) {
  const [emotion, setEmotion] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = () => {
    if (emotion.trim() && description.trim()) {
      onSave(emotion.trim(), description.trim());
      setEmotion("");
      setDescription("");
      onClose();
    }
  };

  const handleClose = () => {
    setEmotion("");
    setDescription("");
    onClose();
  };

  const suggestions = [
    "Motivé", "Nostalgique", "Inspiré", "Déçu", "Fier", "Anxieux", 
    "Surpris", "Reconnaissant", "Frustré", "Optimiste", "Mélancolique",
    "Euphorique", "Pensif", "Confiant", "Inquiet", "Satisfait"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            Créer ton émotion personnalisée
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-orange-800">
                💡 Exprime-toi librement en nouchi !
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-orange-700">
              Crée une émotion unique qui correspond exactement à ce que tu ressens. 
              Utilise le nouchi ivoirien pour que ce soit authentique !
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="emotion" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Nom de l'émotion
            </Label>
            <Input
              id="emotion"
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              placeholder="Ex: Gbagba, Tchatché, Dèh..."
              className="border-orange-200 focus:border-orange-500"
              maxLength={20}
            />
            <p className="text-xs text-gray-500">{emotion.length}/20 caractères</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Description de ton ressenti
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décris ce que tu ressens avec cette émotion... Ex: 'C'est quand tu es dans un état où tu sais pas si tu dois rire ou pleurer, c'est mélangé quoi'"
              className="border-orange-200 focus:border-orange-500 min-h-[80px]"
              maxLength={150}
            />
            <p className="text-xs text-gray-500">{description.length}/150 caractères</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Suggestions d'émotions :
            </Label>
            <div className="flex flex-wrap gap-1">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => setEmotion(suggestion)}
                  className="h-7 text-xs border-orange-200 hover:bg-orange-50 hover:border-orange-300"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!emotion.trim() || !description.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Créer l'émotion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}