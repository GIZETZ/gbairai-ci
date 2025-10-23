import { LocationData } from "@shared/schema";

export interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: number;
}

export class LocationService {
  private static instance: LocationService;
  private cachedLocation: LocationData | null = null;
  private watchId: number | null = null;

  static getInstance(): LocationService {
    if (!this.instance) {
      this.instance = new LocationService();
    }
    return this.instance;
  }

  async getCurrentPosition(forceRefresh = false): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('GPS Position received:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp)
          });
          
          resolve({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            },
            timestamp: position.timestamp
          });
        },
        (error) => {
          let message = 'Unknown error occurred';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Permission de géolocalisation refusée. Veuillez autoriser l\'accès à votre position.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Position GPS indisponible. Vérifiez que votre GPS est activé.';
              break;
            case error.TIMEOUT:
              message = 'Délai d\'attente dépassé pour obtenir votre position GPS.';
              break;
          }
          console.error('GPS Error:', error, message);
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout to 15 seconds
          maximumAge: forceRefresh ? 0 : 60000 // Use fresh data if forced, otherwise 1 minute cache
        }
      );
    });
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<LocationData> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      
      return {
        latitude,
        longitude,
        city: data.address?.city || data.address?.town || data.address?.village || 'Ville inconnue',
        region: data.address?.state || data.address?.region || 'Région inconnue',
        country: data.address?.country || 'Côte d\'Ivoire'
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Fallback to default Ivorian location
      return {
        latitude,
        longitude,
        city: 'Abidjan',
        region: 'Abidjan',
        country: 'Côte d\'Ivoire'
      };
    }
  }

  async getCurrentLocation(forceRefresh = false): Promise<LocationData> {
    try {
      const position = await this.getCurrentPosition(forceRefresh);
      
      // Check if position is accurate enough (within reasonable bounds)
      if (position.coords.accuracy > 100) {
        console.warn('GPS accuracy is low:', position.coords.accuracy, 'meters');
      }
      
      // Verify position is within reasonable bounds for Côte d'Ivoire
      if (!this.isLocationInCoteDivoire(position.coords.latitude, position.coords.longitude)) {
        console.warn('Position outside Côte d\'Ivoire bounds:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      }
      
      const locationData = await this.reverseGeocode(
        position.coords.latitude,
        position.coords.longitude
      );
      
      this.cachedLocation = locationData;
      console.log('Final location data:', locationData);
      return locationData;
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error; // Re-throw to handle in UI
    }
  }

  getCachedLocation(): LocationData | null {
    return this.cachedLocation;
  }

  watchPosition(callback: (location: LocationData) => void): number {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const locationData = await this.reverseGeocode(
            position.coords.latitude,
            position.coords.longitude
          );
          this.cachedLocation = locationData;
          callback(locationData);
        } catch (error) {
          console.error('Error in watch position:', error);
        }
      },
      (error) => {
        console.error('Watch position error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000 // 1 minute cache for watch position
      }
    );

    return this.watchId;
  }

  clearWatch(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  isLocationInCoteDivoire(latitude: number, longitude: number): boolean {
    // Approximate boundaries of Côte d'Ivoire
    const bounds = {
      north: 10.74,
      south: 4.36,
      east: -2.49,
      west: -8.60
    };

    return (
      latitude >= bounds.south &&
      latitude <= bounds.north &&
      longitude >= bounds.west &&
      longitude <= bounds.east
    );
  }
}

export const locationService = LocationService.getInstance();
