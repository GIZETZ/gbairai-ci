# Système de Carte Interactive - Gbairai PWA

## Vue d'ensemble

Le système de carte interactive est le cœur de l'application Gbairai. Il affiche une carte de la Côte d'Ivoire avec des marqueurs colorés représentant les émotions des Gbairais publiés, créant une "carte des émotions" nationale en temps réel.

## Technologies utilisées

### Frontend
- **Leaflet** : Bibliothèque de cartes open-source
- **React-Leaflet** : Composants React pour Leaflet
- **Geolocation API** : Pour la localisation de l'utilisateur
- **Nominatim API** : Pour le géocodage et la recherche d'adresses

### Backend
- **PostGIS** : Extension PostgreSQL pour données géospatiales
- **Turf.js** : Calculs géospatiaux avancés
- **Clustering** : Regroupement intelligent des marqueurs

## Composants principaux

### 1. Composant InteractiveMap
```typescript
// client/src/components/Map/InteractiveMap.tsx
interface InteractiveMapProps {
  gbairais: Gbairai[];
  selectedEmotion?: string;
  onMarkerClick: (gbairai: Gbairai) => void;
  onLocationSelect: (location: LocationData) => void;
  showUserLocation?: boolean;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  gbairais,
  selectedEmotion,
  onMarkerClick,
  onLocationSelect,
  showUserLocation = true
}) => {
  // Configuration de la carte
  const mapConfig = {
    center: [7.539989, -5.54708], // Yamoussoukro (centre CI)
    zoom: 7,
    maxZoom: 18,
    minZoom: 6
  };

  // Filtrage des Gbairais par émotion
  const filteredGbairais = useMemo(() => {
    return selectedEmotion 
      ? gbairais.filter(g => g.emotion === selectedEmotion)
      : gbairais;
  }, [gbairais, selectedEmotion]);

  return (
    <MapContainer {...mapConfig}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      
      {/* Marqueurs des Gbairais */}
      <MarkerClusterGroup>
        {filteredGbairais.map(gbairai => (
          <EmotionMarker
            key={gbairai.id}
            gbairai={gbairai}
            onClick={() => onMarkerClick(gbairai)}
          />
        ))}
      </MarkerClusterGroup>

      {/* Localisation utilisateur */}
      {showUserLocation && <UserLocationMarker />}

      {/* Contrôles personnalisés */}
      <MapControls
        onEmotionFilter={setSelectedEmotion}
        onLocationSearch={onLocationSelect}
      />
    </MapContainer>
  );
};
```

### 2. Marqueurs d'émotion
```typescript
// client/src/components/Map/EmotionMarker.tsx
const EMOTION_COLORS = {
  joie: '#F7C948',
  colere: '#E63946',
  tristesse: '#1D3557',
  amour: '#EF476F',
  suspens: '#7209B7',
  calme: '#06D6A0',
  inclassable: '#BDBDBD'
};

interface EmotionMarkerProps {
  gbairai: Gbairai;
  onClick: () => void;
}

const EmotionMarker: React.FC<EmotionMarkerProps> = ({ gbairai, onClick }) => {
  const emotionColor = EMOTION_COLORS[gbairai.emotion] || EMOTION_COLORS.inclassable;
  
  // Icône SVG personnalisée
  const emotionIcon = new DivIcon({
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${emotionColor};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        animation: pulse 2s infinite;
      ">
        ${getEmotionEmoji(gbairai.emotion)}
      </div>
    `,
    className: 'emotion-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  return (
    <Marker
      position={[gbairai.location.latitude, gbairai.location.longitude]}
      icon={emotionIcon}
      eventHandlers={{
        click: onClick
      }}
    >
      <Popup>
        <GbairaiPreview gbairai={gbairai} />
      </Popup>
    </Marker>
  );
};
```

### 3. Contrôles de la carte
```typescript
// client/src/components/Map/MapControls.tsx
interface MapControlsProps {
  onEmotionFilter: (emotion: string | null) => void;
  onLocationSearch: (location: LocationData) => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  onEmotionFilter,
  onLocationSearch
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);

  return (
    <div className="absolute top-4 right-4 z-1000 bg-white rounded-lg shadow-lg p-4">
      {/* Recherche géographique */}
      <LocationSearch
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onLocationSelect={onLocationSearch}
      />

      {/* Filtres d'émotion */}
      <EmotionFilter
        selectedEmotion={selectedEmotion}
        onEmotionSelect={(emotion) => {
          setSelectedEmotion(emotion);
          onEmotionFilter(emotion);
        }}
      />

      {/* Boutons d'action */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => {
            setSelectedEmotion(null);
            onEmotionFilter(null);
          }}
          className="px-3 py-1 bg-gray-200 rounded text-sm"
        >
          Tout afficher
        </button>
        
        <button
          onClick={() => getCurrentLocation()}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          Ma position
        </button>
      </div>
    </div>
  );
};
```

## Services géospatiaux

### 1. Service de géolocalisation
```typescript
// client/src/services/location.ts
interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
  accuracy?: number;
}

export class LocationService {
  private static instance: LocationService;
  
  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          try {
            const locationData = await this.reverseGeocode(latitude, longitude);
            resolve({
              ...locationData,
              accuracy
            });
          } catch (error) {
            resolve({
              latitude,
              longitude,
              city: 'Inconnue',
              region: 'Inconnue',
              country: 'Côte d\'Ivoire'
            });
          }
        },
        (error) => {
          reject(new Error(`Erreur de géolocalisation: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  async reverseGeocode(lat: number, lon: number): Promise<LocationData> {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
    );
    
    if (!response.ok) {
      throw new Error('Erreur de géocodage inverse');
    }
    
    const data = await response.json();
    
    return {
      latitude: lat,
      longitude: lon,
      city: data.address.city || data.address.town || data.address.village || 'Inconnue',
      region: data.address.state || data.address.region || 'Inconnue',
      country: data.address.country || 'Côte d\'Ivoire'
    };
  }

  async searchLocation(query: string): Promise<LocationData[]> {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ci&limit=5`
    );
    
    if (!response.ok) {
      throw new Error('Erreur de recherche');
    }
    
    const data = await response.json();
    
    return data.map((item: any) => ({
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      city: item.display_name.split(',')[0],
      region: item.display_name.split(',')[1] || 'Inconnue',
      country: 'Côte d\'Ivoire'
    }));
  }
}
```

### 2. Service de clustering
```typescript
// server/services/clustering.ts
import { point, featureCollection, clustersKmeans } from '@turf/turf';

interface ClusterPoint {
  id: string;
  coordinates: [number, number];
  emotion: string;
  count: number;
}

export class ClusteringService {
  static clusterGbairais(gbairais: Gbairai[], zoomLevel: number): ClusterPoint[] {
    if (gbairais.length === 0) return [];

    // Convertir en points GeoJSON
    const points = gbairais.map(gbairai => 
      point([gbairai.location.longitude, gbairai.location.latitude], {
        id: gbairai.id,
        emotion: gbairai.emotion
      })
    );

    // Déterminer le nombre de clusters selon le zoom
    const numClusters = Math.min(
      Math.max(Math.floor(gbairais.length / (20 - zoomLevel)), 1),
      Math.floor(gbairais.length / 2)
    );

    if (numClusters >= gbairais.length) {
      // Pas de clustering nécessaire
      return gbairais.map(gbairai => ({
        id: gbairai.id,
        coordinates: [gbairai.location.longitude, gbairai.location.latitude],
        emotion: gbairai.emotion,
        count: 1
      }));
    }

    // Effectuer le clustering
    const clustered = clustersKmeans(featureCollection(points), numClusters);

    // Traiter les résultats
    return clustered.features.map((cluster, index) => ({
      id: `cluster-${index}`,
      coordinates: cluster.geometry.coordinates,
      emotion: this.getDominantEmotion(cluster.properties.values),
      count: cluster.properties.values.length
    }));
  }

  private static getDominantEmotion(points: any[]): string {
    const emotionCounts: { [key: string]: number } = {};
    
    points.forEach(point => {
      const emotion = point.emotion;
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    return Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0][0];
  }
}
```

## API Endpoints

### Routes de carte
```typescript
// server/routes/map.ts
import express from 'express';
import { ClusteringService } from '../services/clustering';

const router = express.Router();

// Obtenir les marqueurs pour la carte
router.get('/markers', async (req, res) => {
  try {
    const {
      bounds,
      zoom,
      emotion,
      limit = 100
    } = req.query;

    const filters: any = {};
    
    if (bounds) {
      const [south, west, north, east] = bounds.split(',').map(Number);
      filters.location = {
        latitude: { $gte: south, $lte: north },
        longitude: { $gte: west, $lte: east }
      };
    }

    if (emotion) {
      filters.emotion = emotion;
    }

    const gbairais = await storage.getGbairais(filters, parseInt(limit));
    
    // Appliquer le clustering si nécessaire
    const markers = zoom < 12 
      ? ClusteringService.clusterGbairais(gbairais, parseInt(zoom))
      : gbairais.map(g => ({
          id: g.id,
          coordinates: [g.location.longitude, g.location.latitude],
          emotion: g.emotion,
          count: 1
        }));

    res.json({
      markers,
      total: gbairais.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistiques par région
router.get('/regions', async (req, res) => {
  try {
    const stats = await storage.getRegionStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Distribution des émotions
router.get('/emotions', async (req, res) => {
  try {
    const distribution = await storage.getEmotionDistribution();
    res.json(distribution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## Configuration et optimisation

### Optimisations de performance
```typescript
// Configuration optimisée pour la carte
const mapConfig = {
  // Lazy loading des tuiles
  loading: 'lazy',
  
  // Cache des tuiles
  maxZoom: 18,
  tileSize: 256,
  
  // Optimisations rendering
  preferCanvas: true,
  updateWhenIdle: true,
  updateWhenZooming: false,
  
  // Clustering dynamique
  clusterMaxZoom: 12,
  clusterRadius: 50,
  
  // Débouncing des requêtes
  searchDebounce: 300,
  moveDebounce: 500
};
```

### Styles CSS personnalisés
```css
/* client/src/styles/map.css */
.leaflet-container {
  height: 100vh;
  width: 100%;
  z-index: 1;
}

.emotion-marker {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.emotion-marker:hover {
  transform: scale(1.2);
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(247, 201, 72, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(247, 201, 72, 0); }
  100% { box-shadow: 0 0 0 0 rgba(247, 201, 72, 0); }
}

.map-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  padding: 16px;
}

.emotion-filter {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.emotion-button {
  padding: 6px 12px;
  border: 2px solid transparent;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 500;
}

.emotion-button.active {
  border-color: currentColor;
  transform: scale(1.05);
}
```

Ce système de carte interactive offre une expérience utilisateur riche et performante, permettant aux utilisateurs de visualiser et d'interagir avec les émotions collectives de la Côte d'Ivoire en temps réel.