import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MapPin, RefreshCw } from "lucide-react";

interface MapControlsProps {
  onSearch?: (term: string) => void;
  onEmotionFilter?: (emotion: string | null) => void;
  onShowAll?: () => void;
  onMyLocation?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  selectedEmotion?: string | null;
}

const emotions = [
  { id: 'joie', color: '#F7C948', label: 'Joie' },
  { id: 'colere', color: '#E63946', label: 'Colère' },
  { id: 'tristesse', color: '#1D3557', label: 'Tristesse' },
  { id: 'amour', color: '#EF476F', label: 'Amour' },
  { id: 'suspens', color: '#7209B7', label: 'Suspens' },
  { id: 'calme', color: '#06D6A0', label: 'Calme' },
  { id: 'inclassable', color: '#BDBDBD', label: 'Inclassable' }
];

export function MapControls({
  onSearch,
  onEmotionFilter,
  onShowAll,
  onMyLocation,
  onRefresh,
  isLoading = false,
  selectedEmotion
}: MapControlsProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch?.(value);
  };

  const handleEmotionFilter = (emotion: string) => {
    const newEmotion = selectedEmotion === emotion ? null : emotion;
    onEmotionFilter?.(newEmotion);
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div>
        <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
          Rechercher
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            id="search"
            placeholder="Rechercher un lieu..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Emotion Filters */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-2 block">
          Filtrer par émotion
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {emotions.map((emotion) => (
            <Button
              key={emotion.id}
              variant="ghost"
              size="sm"
              className={`w-8 h-8 p-0 rounded-full transition-all hover:scale-110 ${
                selectedEmotion === emotion.id ? 'ring-2 ring-white shadow-lg' : ''
              }`}
              style={{ backgroundColor: emotion.color }}
              onClick={() => handleEmotionFilter(emotion.id)}
              title={emotion.label}
            />
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={onShowAll}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <Filter className="w-4 h-4 mr-2" />
          Tout afficher
        </Button>
        <Button
          onClick={onMyLocation}
          size="sm"
          className="flex-1 bg-ivorian-orange hover:bg-orange-600"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Ma position
        </Button>
      </div>

      {/* Refresh Button */}
      <Button
        onClick={onRefresh}
        variant="outline"
        size="sm"
        className="w-full"
        disabled={isLoading}
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        Actualiser
      </Button>

      {/* Selected Emotion Badge */}
      {selectedEmotion && (
        <Badge variant="secondary" className="w-full justify-center">
          Filtré par: {emotions.find(e => e.id === selectedEmotion)?.label}
        </Badge>
      )}
    </div>
  );
}
