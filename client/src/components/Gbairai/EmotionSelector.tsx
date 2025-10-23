import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { EmotionSuggestion } from "@shared/schema";
import { CustomEmotionEditor } from "./CustomEmotionEditor";

interface EmotionSelectorProps {
  selectedEmotion: string | null;
  onEmotionSelect: (emotion: string) => void;
  suggestions: EmotionSuggestion[];
  isAnalyzing: boolean;
  customEmotion?: string;
  onCustomEmotion?: (emotion: string, description: string) => void;
}

const emotions = [
  { id: "enjaillé", label: "Enjaillé", emoji: "😊", color: "bg-yellow-100 border-yellow-300" },
  { id: "nerveux", label: "Nerveux", emoji: "😠", color: "bg-red-100 border-red-300" },
  { id: "goumin", label: "Goumin", emoji: "😢", color: "bg-blue-100 border-blue-300" },
  { id: "trop fan", label: "Trop Fan", emoji: "❤️", color: "bg-pink-100 border-pink-300" },
  { id: "Mais Ahy?", label: "Mais Ahy?", emoji: "🤔", color: "bg-purple-100 border-purple-300" },
  { id: "Légé", label: "Légé", emoji: "😌", color: "bg-green-100 border-green-300" },
  { id: "inclassable", label: "Inclassable", emoji: "🎨", color: "bg-orange-100 border-orange-300" },
];

export function EmotionSelector({
  selectedEmotion,
  onEmotionSelect,
  suggestions,
  isAnalyzing,
  customEmotion,
  onCustomEmotion
}: EmotionSelectorProps) {
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const getSuggestionConfidence = (emotionId: string) => {
    const suggestion = suggestions.find(s => s.emotion === emotionId);
    return suggestion?.confidence || 0;
  };

  const getTopSuggestion = () => {
    return suggestions.length > 0 ? suggestions[0] : null;
  };

  const topSuggestion = getTopSuggestion();

  return (
    <div className="space-y-4">
      {/* Suggestions IA */}
      {topSuggestion && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              IA suggère: {topSuggestion.emotion}
            </span>
            <Badge variant="secondary">
              {Math.round(topSuggestion.confidence * 100)}%
            </Badge>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            {topSuggestion.reasoning}
          </p>
        </div>
      )}

      {/* Grille des émotions */}
      <div className="grid grid-cols-4 gap-2">
        {emotions.map((emotion) => {
          const confidence = getSuggestionConfidence(emotion.id);
          const isSelected = selectedEmotion === emotion.id;
          const isSuggested = confidence > 0.5;

          return (
            <Tooltip key={emotion.id}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={`p-2 h-16 flex flex-col items-center justify-center relative border-2 transition-all
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-transparent hover:border-gray-300'
                    }
                    ${isSuggested && !isSelected ? 'ring-2 ring-blue-200' : ''}
                  `}
                  onClick={() => {
                    if (emotion.id === 'inclassable') {
                      setShowCustomEditor(true);
                    } else {
                      onEmotionSelect(emotion.id);
                    }
                  }}
                >
                  <div className={`w-8 h-8 ${emotion.color} rounded-full mb-1 flex items-center justify-center text-white text-sm font-bold`}>
                    {emotion.emoji}
                  </div>
                  
                  {isSuggested && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-medium">{emotion.label}</p>
                  {confidence > 0 && (
                    <p className="text-xs text-gray-500">
                      Confiance: {Math.round(confidence * 100)}%
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Émotion personnalisée sélectionnée */}
      {selectedEmotion === 'inclassable' && customEmotion && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-orange-900">
              🎨 Émotion personnalisée: {customEmotion}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomEditor(true)}
              className="text-orange-600 hover:text-orange-800"
            >
              Modifier
            </Button>
          </div>
        </div>
      )}

      {/* Légende */}
      <div className="text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>Suggéré par l'IA</span>
        </div>
      </div>

      {/* Éditeur d'émotion personnalisée */}
      <CustomEmotionEditor
        isOpen={showCustomEditor}
        onClose={() => setShowCustomEditor(false)}
        onSave={(emotion, description) => {
          onCustomEmotion?.(emotion, description);
          onEmotionSelect('inclassable');
        }}
      />
    </div>
  );
}
