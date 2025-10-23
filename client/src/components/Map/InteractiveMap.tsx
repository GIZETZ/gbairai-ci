import { useEffect, useRef, useState } from "react";
import { useGbairais } from "@/hooks/useGbairais";
import { useLocation } from "@/hooks/useLocation";
import { GbairaiWithInteractions } from "@shared/schema";
import { EmotionMarker } from "./EmotionMarker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, Filter, RefreshCw, Move } from "lucide-react";

// Import Leaflet types
declare global {
  interface Window {
    L: any;
  }
}

const emotionColors = {
  joie: '#F7C948',
  colere: '#E63946',
  tristesse: '#1D3557',
  amour: '#EF476F',
  suspens: '#7209B7',
  calme: '#06D6A0',
  inclassable: '#BDBDBD'
};

const emotionEmojis = {
  joie: '😊',
  colere: '😠',
  tristesse: '😢',
  amour: '❤️',
  suspens: '🤔',
  calme: '😌',
  inclassable: '🤷'
};

interface InteractiveMapProps {
  compact?: boolean;
  isGuest?: boolean;
  onAuthRequired?: () => void;
}

export function InteractiveMap({ 
  compact = false, 
  isGuest = false, 
  onAuthRequired 
}: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const commentBoxRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [selectedGbairai, setSelectedGbairai] = useState<GbairaiWithInteractions | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [controlsPosition, setControlsPosition] = useState({ x: 16, y: 16 });

  const { data: gbairais, isLoading: gbairaisLoading, refetch } = useGbairais();
  const { location, getCurrentLocation, isLoading: locationLoading } = useLocation();

  // Load Leaflet dynamically
  useEffect(() => {
    const loadLeaflet = async () => {
      if (typeof window !== 'undefined' && !window.L) {
        // Load Leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          // Load MarkerCluster
          const clusterScript = document.createElement('script');
          clusterScript.src = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js';
          clusterScript.onload = () => {
            const clusterCSS = document.createElement('link');
            clusterCSS.rel = 'stylesheet';
            clusterCSS.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css';
            document.head.appendChild(clusterCSS);

            const clusterDefaultCSS = document.createElement('link');
            clusterDefaultCSS.rel = 'stylesheet';
            clusterDefaultCSS.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css';
            document.head.appendChild(clusterDefaultCSS);

            setIsLoaded(true);
          };
          document.head.appendChild(clusterScript);
        };
        document.head.appendChild(script);
      } else if (window.L) {
        setIsLoaded(true);
      }
    };

    loadLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstance.current) return;

    const L = window.L;

    // Initialize map centered on Côte d'Ivoire
    const map = L.map(mapRef.current, {
      center: [7.539989, -5.54708],
      zoom: 7,
      zoomControl: false
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add zoom control to top-left
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Initialize marker cluster group
    const markers = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true
    });

    mapInstance.current = map;
    markersRef.current = markers;
    map.addLayer(markers);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [isLoaded]);

  // Update markers when gbairais data changes
  useEffect(() => {
    if (!isLoaded || !mapInstance.current || !markersRef.current || !gbairais) return;

    const L = window.L;
    const markers = markersRef.current;
    markers.clearLayers();

    // Filter gbairais based on search and emotion filter
    const filteredGbairais = gbairais.filter(gbairai => {
      const matchesSearch = !searchTerm || 
        gbairai.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEmotion = !selectedEmotion || gbairai.emotion === selectedEmotion;
      return matchesSearch && matchesEmotion && gbairai.location;
    });

    filteredGbairais.forEach(gbairai => {
      const location = gbairai.location as any;
      if (!location?.latitude || !location?.longitude) return;

      const color = emotionColors[gbairai.emotion as keyof typeof emotionColors];
      const emoji = emotionEmojis[gbairai.emotion as keyof typeof emotionEmojis];

      const icon = L.divIcon({
        html: `
          <div style="
            width: 24px;
            height: 24px;
            background: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            animation: pulse 2s infinite;
          ">
            ${emoji}
          </div>
        `,
        className: 'emotion-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([location.latitude, location.longitude], { icon })
        .bindPopup(`
          <div class="p-3 min-w-60">
            <div class="flex items-center space-x-2 mb-2">
              <div class="w-6 h-6 rounded-full" style="background-color: ${color}"></div>
              <span class="text-sm font-medium">${gbairai.emotion}</span>
              <span class="text-xs text-gray-500">
                ${new Date(gbairai.createdAt!).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div class="text-gray-800 mb-3 min-h-24 flex items-center justify-center" style="font-size: 30px; font-weight: 600; text-align: center;">
              ${gbairai.content}
            </div>
            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>📍 ${location.city || location.region || 'Lieu inconnu'}</span>
              <div class="flex space-x-3">
                <span>👍 ${gbairai.likesCount}</span>
                <span>💬 ${gbairai.commentsCount}</span>
              </div>
            </div>
          </div>
        `);

      marker.on('click', () => {
        setSelectedGbairai(gbairai);
      });

      markers.addLayer(marker);
    });

    // Add CSS for pulse animation
    if (!document.getElementById('pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'pulse-animation';
      style.textContent = `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(247, 201, 72, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(247, 201, 72, 0); }
          100% { box-shadow: 0 0 0 0 rgba(247, 201, 72, 0); }
        }
      `;
      document.head.appendChild(style);
    }
  }, [isLoaded, gbairais, searchTerm, selectedEmotion]);

  const handleMyLocation = async () => {
    if (!mapInstance.current) return;

    try {
      // Force refresh to get the most accurate current position
      const userLocation = await getCurrentLocation(true);
      if (userLocation) {
        const L = window.L;
        mapInstance.current.setView([userLocation.latitude, userLocation.longitude], 15);

        // Clear any existing user location markers
        mapInstance.current.eachLayer((layer: any) => {
          if (layer.options?.className === 'user-marker') {
            mapInstance.current.removeLayer(layer);
          }
        });

        // Add user location marker
        const userIcon = L.divIcon({
          html: `
            <div style="
              width: 20px;
              height: 20px;
              background: #1D3557;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              animation: pulse 2s infinite;
            "></div>
          `,
          className: 'user-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon })
          .addTo(mapInstance.current)
          .bindPopup(`📍 Votre position<br/>📍 ${userLocation.city}, ${userLocation.region}`)
          .openPopup();
      }
    } catch (error) {
      console.error('Error getting location:', error);
      // Show error message to user
      const errorMessage = error instanceof Error ? error.message : 'Erreur de géolocalisation';

      // Create a temporary popup to show error
      if (mapInstance.current) {
        const L = window.L;
        const popup = L.popup()
          .setLatLng([7.539989, -5.54708]) // Center of Côte d'Ivoire
          .setContent(`❌ ${errorMessage}`)
          .openOn(mapInstance.current);

        // Auto-close popup after 3 seconds
        setTimeout(() => {
          if (mapInstance.current) {
            mapInstance.current.closePopup(popup);
          }
        }, 3000);
      }
    }
  };

  const handleEmotionFilter = (emotion: string) => {
    setSelectedEmotion(selectedEmotion === emotion ? null : emotion);
  };

  const handleShowAll = () => {
    setSelectedEmotion(null);
    setSearchTerm("");
  };

  // Fonctions de gestion du glisser-déposer pour la souris
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - controlsPosition.x,
      y: e.clientY - controlsPosition.y
    });
  };

  // Fonctions de gestion du glisser-déposer pour le tactile
  const handleTouchStart = (e: React.TouchEvent) => {
  setIsDragging(true);
  const touch = e.touches[0];
  setDragStart({
    x: touch.clientX - controlsPosition.x,
    y: touch.clientY - controlsPosition.y
  });
};

  // Ajouter les event listeners pour le glisser-déposer
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        const maxX = window.innerWidth - 256;
        const maxY = window.innerHeight - 160;

        setControlsPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      };

      const handleGlobalTouchMove = (e: TouchEvent) => {
        const touch = e.touches[0];
        const newX = touch.clientX - dragStart.x;
        const newY = touch.clientY - dragStart.y;

        const maxX = window.innerWidth - 256;
        const maxY = window.innerHeight - 160;

        setControlsPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };

      const handleGlobalTouchEnd = () => {
        setIsDragging(false);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove);
      document.addEventListener('touchend', handleGlobalTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('touchmove', handleGlobalTouchMove);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
      };
    }
  }, [isDragging, dragStart]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ivorian-orange mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Map Controls */}
      <div 
        ref={commentBoxRef}
        className="absolute bg-gray-800 rounded-lg shadow-lg p-4 z-10 w-64 cursor-move"
        style={{ 
          left: `${controlsPosition.x}px`, 
          top: `${controlsPosition.y}px`,
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Header avec icône de déplacement */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-600">
          <h3 className="text-white font-medium text-sm">Contrôles de la carte</h3>
          <Move className="w-4 h-4 text-gray-400" />
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher un lieu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Emotion Filters */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Filtrer par émotion
          </label>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(emotionColors).map(([emotion, color]) => (
              <Button
                key={emotion}
                variant="ghost"
                size="sm"
                className={`w-8 h-8 p-0 rounded-full transition-all ${
                  selectedEmotion === emotion ? 'ring-2 ring-blue-400 shadow-lg' : ''
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleEmotionFilter(emotion)}
                title={emotion}
                disabled={isGuest}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleShowAll}
            variant="outline"
            size="sm"
            className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            <Filter className="w-4 h-4 mr-2" />
            Tout afficher
          </Button>
          <Button
            onClick={handleMyLocation}
            disabled={locationLoading || isGuest}
            size="sm"
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <MapPin className="w-0.1 h-0.1 mr-0.1" />
            {locationLoading ? 'Localisation...' : 'Ma position'}
          </Button>
        </div>

        {/* GPS Accuracy Button */}
        <div className="mt-2">
          <Button
            onClick={handleMyLocation}
            disabled={locationLoading || isGuest}
            variant="outline"
            size="sm"
            className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${locationLoading ? 'animate-spin' : ''}`} />
            Actualiser GPS
          </Button>
        </div>

        {/* Refresh Button */}
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="w-full mt-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          disabled={gbairaisLoading || isGuest}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${gbairaisLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>

        {/* Selected Emotion Badge */}
        {selectedEmotion && (
          <div className="mt-2">
            <Badge variant="secondary" className="w-full justify-center bg-blue-600 text-white">
              Filtré par: {selectedEmotion}
            </Badge>
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-800 rounded-lg shadow-lg p-3 z-10">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Légende des émotions</h4>
        <div className="space-y-1">
          {Object.entries(emotionColors).map(([emotion, color]) => (
            <div key={emotion} className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-300 capitalize">{emotion}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}