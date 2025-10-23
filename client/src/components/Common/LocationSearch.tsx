
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Navigation, Loader2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { locationService } from "@/services/location";
import { useLocation } from "@/hooks/useLocation";

interface LocationSearchProps {
  onLocationFilter: (location: {
    city?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
  } | null) => void;
  currentLocationFilter: {
    city?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
  } | null;
}

// Villes principales de Côte d'Ivoire avec leurs régions
const IVORIAN_CITIES = [
  // Abidjan et communes
  { city: "Abidjan", region: "Abidjan", communes: ["Cocody", "Plateau", "Yopougon", "Adjamé", "Koumassi", "Marcory", "Treichville", "Abobo", "Attécoubé", "Port-Bouët"] },
  { city: "Cocody", region: "Abidjan", type: "commune" },
  { city: "Plateau", region: "Abidjan", type: "commune" },
  { city: "Yopougon", region: "Abidjan", type: "commune" },
  { city: "Adjamé", region: "Abidjan", type: "commune" },
  { city: "Koumassi", region: "Abidjan", type: "commune" },
  { city: "Marcory", region: "Abidjan", type: "commune" },
  { city: "Treichville", region: "Abidjan", type: "commune" },
  { city: "Abobo", region: "Abidjan", type: "commune" },
  { city: "Attécoubé", region: "Abidjan", type: "commune" },
  { city: "Port-Bouët", region: "Abidjan", type: "commune" },
  
  // Autres grandes villes
  { city: "Yamoussoukro", region: "Yamoussoukro" },
  { city: "Bouaké", region: "Vallée du Bandama" },
  { city: "Daloa", region: "Haut-Sassandra" },
  { city: "Korhogo", region: "Poro" },
  { city: "San-Pédro", region: "San-Pédro" },
  { city: "Man", region: "Tonkpi" },
  { city: "Divo", region: "Lôh-Djiboua" },
  { city: "Gagnoa", region: "Gôh" },
  { city: "Abengourou", region: "Indénié-Djuablin" },
  { city: "Soubré", region: "Nawa" },
  { city: "Agboville", region: "Agnéby-Tiassa" },
  { city: "Anyama", region: "Abidjan" },
  { city: "Dabou", region: "Grands-Ponts" },
  { city: "Dimbokro", region: "N'Zi" },
  { city: "Issia", region: "Haut-Sassandra" },
  { city: "Katiola", region: "Hambol" },
  { city: "Odienné", region: "Kabadougou" },
  { city: "Séguéla", region: "Worodougou" },
  { city: "Sinfra", region: "Marahoué" },
  { city: "Tabou", region: "San-Pédro" },
  { city: "Touba", region: "Bafing" },
  { city: "Boundiali", region: "Bagoué" },
  { city: "Ferkessédougou", region: "Tchologo" },
  { city: "Aboisso", region: "Sud-Comoé" },
  { city: "Adzopé", region: "La Mé" },
  { city: "Bondoukou", region: "Gontougo" },
  { city: "Bouna", region: "Bounkani" },
  { city: "Danané", region: "Tonkpi" },
  { city: "Duékoué", region: "Guémon" },
  { city: "Grand-Bassam", region: "Sud-Comoé" },
  { city: "Guiglo", region: "Cavally" },
  { city: "Lakota", region: "Lôh-Djiboua" },
  { city: "Mankono", region: "Béré" },
  { city: "Sassandra", region: "Gbôklé" },
  { city: "Tengréla", region: "Poro" },
  { city: "Tiassalé", region: "Agnéby-Tiassa" },
  { city: "Toulepleu", region: "Cavally" },
  { city: "Vavoua", region: "Haut-Sassandra" },
  { city: "Zuenoula", region: "Marahoué" }
];

export function LocationSearch({ onLocationFilter, currentLocationFilter }: LocationSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<typeof IVORIAN_CITIES>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  
  const { getCurrentLocation, location, isLoading, error } = useLocation();

  // Filtrer les suggestions basées sur la recherche
  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = IVORIAN_CITIES.filter(location =>
        location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.region.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 8);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm]);

  const handleLocationSelect = (selectedLocation: typeof IVORIAN_CITIES[0]) => {
    try {
      onLocationFilter({
        city: selectedLocation.city,
        region: selectedLocation.region
      });
      setSearchTerm(selectedLocation.city);
      setShowSuggestions(false);
    } catch (error) {
      console.error("Erreur lors de la sélection de la zone:", error);
    }
  };

  const handleGeolocation = async () => {
    setIsGeolocating(true);
    try {
      const currentLocation = await getCurrentLocation(true);
      if (currentLocation) {
        onLocationFilter({
          city: currentLocation.city,
          region: currentLocation.region,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        });
        setSearchTerm(`${currentLocation.city}, ${currentLocation.region}`);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Erreur de géolocalisation:", error);
      // Afficher un message d'erreur à l'utilisateur
    } finally {
      setIsGeolocating(false);
    }
  };

  const clearLocationFilter = () => {
    onLocationFilter(null);
    setSearchTerm("");
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white mb-2 flex items-center">
        <MapPin className="w-4 h-4 mr-1" />
        Recherche géographique
      </label>
      
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Rechercher une ville, commune..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 pr-8"
              onFocus={() => setShowSuggestions(searchTerm.length > 0)}
              onBlur={() => {
                // Délai pour permettre le clic sur les suggestions
                setTimeout(() => setShowSuggestions(false), 200);
              }}
            />
            <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            
            {currentLocationFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearLocationFilter}
                className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1 h-auto text-gray-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeolocation}
            disabled={isGeolocating || isLoading}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            {isGeolocating || isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1 bg-gray-700 border-gray-600">
            <CardContent className="p-2 max-h-48 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.city}-${suggestion.region}-${index}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLocationSelect(suggestion);
                  }}
                  onMouseDown={(e) => {
                    // Empêcher le blur de l'input
                    e.preventDefault();
                  }}
                  className="w-full text-left p-2 rounded hover:bg-gray-600 text-white flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="font-medium">{suggestion.city}</div>
                    <div className="text-xs text-gray-300">
                      {suggestion.region}
                      {suggestion.type === "commune" && " (Commune)"}
                    </div>
                  </div>
                  <MapPin className="w-3 h-3 text-gray-400" />
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Affichage de la localisation actuelle */}
      {currentLocationFilter && (
        <div className="pt-2">
          <Badge variant="secondary" className="bg-green-600 text-white">
            📍 {currentLocationFilter.city}
            {currentLocationFilter.region && `, ${currentLocationFilter.region}`}
            {currentLocationFilter.latitude && currentLocationFilter.longitude && " (GPS)"}
          </Badge>
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
