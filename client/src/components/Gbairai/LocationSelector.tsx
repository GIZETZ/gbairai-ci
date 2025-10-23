import { useState, useEffect } from "react";
import { MapPin, Search, Check, Loader2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Location {
  city: string;
  region: string;
  country: string;
}

interface LocationSelectorProps {
  selectedLocation: Location | null;
  onLocationSelect: (location: Location) => void;
}

// Principales villes et régions de Côte d'Ivoire
const ivorianLocations = [
  // Abidjan et environs
  { city: "Abidjan", region: "Abidjan", country: "Côte d'Ivoire" },
  { city: "Cocody", region: "Abidjan", country: "Côte d'Ivoire" },
  { city: "Plateau", region: "Abidjan", country: "Côte d'Ivoire" },
  { city: "Yopougon", region: "Abidjan", country: "Côte d'Ivoire" },
  { city: "Adjamé", region: "Abidjan", country: "Côte d'Ivoire" },
  { city: "Koumassi", region: "Abidjan", country: "Côte d'Ivoire" },
  { city: "Marcory", region: "Abidjan", country: "Côte d'Ivoire" },
  { city: "Treichville", region: "Abidjan", country: "Côte d'Ivoire" },
  { city: "Abobo", region: "Abidjan", country: "Côte d'Ivoire" },
  { city: "Bingerville", region: "Abidjan", country: "Côte d'Ivoire" },
  
  // Autres grandes villes
  { city: "Yamoussoukro", region: "Yamoussoukro", country: "Côte d'Ivoire" },
  { city: "Bouaké", region: "Vallée du Bandama", country: "Côte d'Ivoire" },
  { city: "Daloa", region: "Haut-Sassandra", country: "Côte d'Ivoire" },
  { city: "Korhogo", region: "Poro", country: "Côte d'Ivoire" },
  { city: "San-Pédro", region: "San-Pédro", country: "Côte d'Ivoire" },
  { city: "Man", region: "Tonkpi", country: "Côte d'Ivoire" },
  { city: "Divo", region: "Lôh-Djiboua", country: "Côte d'Ivoire" },
  { city: "Gagnoa", region: "Gôh", country: "Côte d'Ivoire" },
  { city: "Abengourou", region: "Indénié-Djuablin", country: "Côte d'Ivoire" },
  { city: "Soubré", region: "Nawa", country: "Côte d'Ivoire" },
  { city: "Agboville", region: "Agnéby-Tiassa", country: "Côte d'Ivoire" },
  { city: "Anyama", region: "Abidjan", country: "Côte d'Ivoire" },
  { city: "Dabou", region: "Grands-Ponts", country: "Côte d'Ivoire" },
  { city: "Dimbokro", region: "N'Zi", country: "Côte d'Ivoire" },
  { city: "Issia", region: "Haut-Sassandra", country: "Côte d'Ivoire" },
  { city: "Katiola", region: "Hambol", country: "Côte d'Ivoire" },
  { city: "Odienné", region: "Kabadougou", country: "Côte d'Ivoire" },
  { city: "Séguéla", region: "Worodougou", country: "Côte d'Ivoire" },
  { city: "Sinfra", region: "Marahoué", country: "Côte d'Ivoire" },
  { city: "Tabou", region: "San-Pédro", country: "Côte d'Ivoire" },
  { city: "Touba", region: "Bafing", country: "Côte d'Ivoire" },
  { city: "Boundiali", region: "Bagoué", country: "Côte d'Ivoire" },
  { city: "Ferkessédougou", region: "Tchologo", country: "Côte d'Ivoire" },
  { city: "Aboisso", region: "Sud-Comoé", country: "Côte d'Ivoire" },
  { city: "Adzopé", region: "La Mé", country: "Côte d'Ivoire" },
  { city: "Bondoukou", region: "Gontougo", country: "Côte d'Ivoire" },
  { city: "Bouna", region: "Bounkani", country: "Côte d'Ivoire" },
  { city: "Danané", region: "Tonkpi", country: "Côte d'Ivoire" },
  { city: "Duékoué", region: "Guémon", country: "Côte d'Ivoire" },
  { city: "Grand-Bassam", region: "Sud-Comoé", country: "Côte d'Ivoire" },
  { city: "Guiglo", region: "Cavally", country: "Côte d'Ivoire" },
  { city: "Kani", region: "Worodougou", country: "Côte d'Ivoire" },
  { city: "Lakota", region: "Lôh-Djiboua", country: "Côte d'Ivoire" },
  { city: "Mankono", region: "Béré", country: "Côte d'Ivoire" },
  { city: "Minignan", region: "Folon", country: "Côte d'Ivoire" },
  { city: "Sassandra", region: "Gbôklé", country: "Côte d'Ivoire" },
  { city: "Tengréla", region: "Poro", country: "Côte d'Ivoire" },
  { city: "Tiassalé", region: "Agnéby-Tiassa", country: "Côte d'Ivoire" },
  { city: "Toulepleu", region: "Cavally", country: "Côte d'Ivoire" },
  { city: "Vavoua", region: "Haut-Sassandra", country: "Côte d'Ivoire" },
  { city: "Zuenoula", region: "Marahoué", country: "Côte d'Ivoire" },
];

export function LocationSelector({ selectedLocation, onLocationSelect }: LocationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);

  const filteredLocations = ivorianLocations.filter(location =>
    location.city.toLowerCase().includes(searchValue.toLowerCase()) ||
    location.region.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleLocationSelect = (location: Location) => {
    onLocationSelect(location);
    setOpen(false);
  };

  // Fonction pour détecter automatiquement la localisation
  const detectCurrentLocation = async () => {
    setIsDetecting(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Essayer de trouver la ville la plus proche parmi les locations ivoiriennes
      // Pour une implémentation simple, on peut utiliser Abidjan comme défaut
      // ou implémenter une logique de géolocalisation inverse
      
      // Détection simplifiée basée sur les coordonnées approximatives
      let detectedLocation: Location;
      
      if (latitude >= 5.0 && latitude <= 6.0 && longitude >= -5.0 && longitude <= -3.0) {
        detectedLocation = { city: "Abidjan", region: "Abidjan", country: "Côte d'Ivoire" };
      } else if (latitude >= 6.0 && latitude <= 7.0 && longitude >= -6.0 && longitude <= -4.0) {
        detectedLocation = { city: "Yamoussoukro", region: "Yamoussoukro", country: "Côte d'Ivoire" };
      } else if (latitude >= 7.0 && latitude <= 8.0 && longitude >= -6.0 && longitude <= -4.0) {
        detectedLocation = { city: "Bouaké", region: "Vallée du Bandama", country: "Côte d'Ivoire" };
      } else {
        // Localisation par défaut si pas de correspondance
        detectedLocation = { city: "Abidjan", region: "Abidjan", country: "Côte d'Ivoire" };
      }
      
      onLocationSelect(detectedLocation);
      
    } catch (error) {
      console.error("Erreur de géolocalisation:", error);
      // En cas d'erreur, utiliser Abidjan par défaut
      onLocationSelect({ city: "Abidjan", region: "Abidjan", country: "Côte d'Ivoire" });
    } finally {
      setIsDetecting(false);
    }
  };

  // Détecter automatiquement la localisation au chargement si aucune n'est sélectionnée
  useEffect(() => {
    if (!selectedLocation) {
      detectCurrentLocation();
    }
  }, []);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-yellow-800 dark:text-white">Localisation</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between bg-yellow-50 dark:bg-gray-700 border-yellow-300 dark:border-gray-600 text-yellow-800 dark:text-white hover:bg-yellow-100 dark:hover:bg-gray-600"
            >
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-yellow-600 dark:text-gray-400" />
                <span>
                  {isDetecting ? "Détection..." : selectedLocation
                    ? `${selectedLocation.city}, ${selectedLocation.region}`
                    : "C'est où ça ?"}
                </span>
              </div>
              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-white dark:bg-gray-800 border-yellow-300 dark:border-gray-700" align="start">
          <Command className="bg-white dark:bg-gray-800 border-yellow-300 dark:border-gray-700">
            <CommandInput
              placeholder="Rechercher une ville ou région..."
              value={searchValue}
              onValueChange={setSearchValue}
              className="bg-yellow-50 dark:bg-gray-700 border-yellow-300 dark:border-gray-600 text-yellow-800 dark:text-white placeholder:text-yellow-600 dark:placeholder:text-gray-400"
            />
            <CommandList className="bg-white dark:bg-gray-800">
              <CommandEmpty className="text-yellow-800 dark:text-white">Aucune localisation trouvée.</CommandEmpty>
              <CommandGroup>
                {filteredLocations.map((location) => (
                  <CommandItem
                    key={`${location.city}-${location.region}`}
                    value={`${location.city} ${location.region}`}
                    onSelect={() => handleLocationSelect(location)}
                    className="text-yellow-800 dark:text-white hover:bg-yellow-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <Check
                      className={`mr-2 h-4 w-4 text-yellow-800 dark:text-white ${
                        selectedLocation?.city === location.city &&
                        selectedLocation?.region === location.region
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-yellow-800 dark:text-white">{location.city}</span>
                      <span className="text-xs text-yellow-600 dark:text-gray-300">{location.region}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Bouton de détection automatique */}
      <Button
        variant="outline"
        size="sm"
        onClick={detectCurrentLocation}
        disabled={isDetecting}
        className="px-3 bg-yellow-50 dark:bg-gray-700 border-yellow-300 dark:border-gray-600 text-yellow-800 dark:text-white hover:bg-yellow-100 dark:hover:bg-gray-600"
      >
        {isDetecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Navigation className="w-4 h-4" />
        )}
      </Button>
      </div>
    </div>
  );
}