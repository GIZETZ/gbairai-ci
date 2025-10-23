import { Layout } from "@/components/Common/Layout";
import { InteractiveMap } from "@/components/Map/InteractiveMap";
import { GbairaiForm } from "@/components/Gbairai/GbairaiForm";
import { GbairaiCard } from "@/components/Gbairai/GbairaiCard";
import { GbairaiFilters } from "@/components/Common/GbairaiFilters";
import { useGbairais } from "@/hooks/useGbairais";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { GbairaiWithInteractions } from "@shared/schema";

export default function HomePage() {
  // Charger les filtres depuis localStorage au démarrage
  const loadFiltersFromStorage = () => {
    try {
      const savedFilters = localStorage.getItem('gbairai-filters');
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        return {
          region: parsed.region,
          followingOnly: parsed.followingOnly || false,
          emotion: parsed.emotion,
          location: parsed.location,
        };
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

  const [filters, setFilters] = useState(loadFiltersFromStorage);
  const { data: gbairais, isLoading, refetch } = useGbairais(filters);

  // Force refresh when user comes back to the page
  useEffect(() => {
    const handleFocus = () => {
      refetch();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);
  const [highlightedGbairaiId, setHighlightedGbairaiId] = useState<number | null>(null);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    // Sauvegarder les filtres dans localStorage
    try {
      localStorage.setItem('gbairai-filters', JSON.stringify(newFilters));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des filtres:', error);
    }
  };

  // Récupérer le paramètre gbairai de l'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gbairaiId = urlParams.get('gbairai');
    if (gbairaiId) {
      setHighlightedGbairaiId(parseInt(gbairaiId));
      // Nettoyer l'URL après avoir récupéré le paramètre
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Récupérer les détails du Gbairai spécifique si nécessaire
  const { data: highlightedGbairai } = useQuery<GbairaiWithInteractions>({
    queryKey: [`/api/gbairais/${highlightedGbairaiId}`],
    enabled: !!highlightedGbairaiId,
  });

  // Auto-scroll vers le Gbairai mis en avant
  useEffect(() => {
    if (highlightedGbairaiId && gbairais && gbairais.length > 0) {
      const timer = setTimeout(() => {
        // Vérifier si le Gbairai est dans la liste actuelle
        const targetGbairai = gbairais.find(g => g.id === highlightedGbairaiId);
        if (targetGbairai) {
          const gbairaiElement = document.getElementById(`gbairai-${highlightedGbairaiId}`);
          if (gbairaiElement) {
            gbairaiElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        } else if (highlightedGbairai) {
          // Si le Gbairai n'est pas dans la liste, scroll vers la section "en focus"
          const focusElement = document.getElementById('gbairai-focus');
          if (focusElement) {
            focusElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }
      }, 500); // Délai pour laisser le temps au contenu de se charger

      return () => clearTimeout(timer);
    }
  }, [highlightedGbairaiId, gbairais, highlightedGbairai]);

  return (
    <Layout>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-80 bg-card shadow-lg flex flex-col">
          {/* Publication Form */}
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">
              Publier un Gbairai
            </h2>
            <GbairaiForm />
          </div>

          {/* Filtres */}
          <div className="border-b border-border">
            <GbairaiFilters
              onFilterChange={handleFilterChange}
              currentFilters={filters}
            />
          </div>

          {/* Recent Gbairais Feed */}
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              Gbairais récents
            </h3>
            <div className="space-y-4">
              {/* Gbairai mis en avant s'il y en a un */}
              {highlightedGbairai && (
                <div id="gbairai-focus" className="border-2 border-primary rounded-lg p-2">
                  <div className="text-sm text-primary font-medium mb-2">📍 Gbairai en focus</div>
                  <GbairaiCard gbairai={highlightedGbairai} compact />
                </div>
              )}

              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))
              ) : (
                gbairais?.slice(0, 10).map((gbairai) => (
                  <div key={gbairai.id} id={`gbairai-${gbairai.id}`}>
                    <GbairaiCard 
                      gbairai={gbairai} 
                      compact 
                      highlighted={gbairai.id === highlightedGbairaiId}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <InteractiveMap />
        </div>
      </div>
    </Layout>
  );
}