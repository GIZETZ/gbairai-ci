import { useState, useEffect, useCallback } from "react";
import { locationService } from "@/services/location";
import { LocationData } from "@shared/schema";

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(async (forceRefresh = false): Promise<LocationData | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const locationData = await locationService.getCurrentLocation(forceRefresh);
      setLocation(locationData);
      return locationData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de géolocalisation inconnue';
      setError(errorMessage);
      
      // Try to use cached location as fallback
      const cachedLocation = locationService.getCachedLocation();
      if (cachedLocation) {
        console.log('Using cached location as fallback:', cachedLocation);
        setLocation(cachedLocation);
        return cachedLocation;
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const watchLocation = useCallback(() => {
    try {
      return locationService.watchPosition((locationData) => {
        setLocation(locationData);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    }
  }, []);

  const clearWatch = useCallback(() => {
    locationService.clearWatch();
  }, []);

  // Initialize with cached location if available
  useEffect(() => {
    const cachedLocation = locationService.getCachedLocation();
    if (cachedLocation) {
      setLocation(cachedLocation);
    }
  }, []);

  return {
    location,
    isLoading,
    error,
    getCurrentLocation,
    watchLocation,
    clearWatch,
    isLocationInCoteDivoire: (lat: number, lon: number) => 
      locationService.isLocationInCoteDivoire(lat, lon),
    calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) =>
      locationService.calculateDistance(lat1, lon1, lat2, lon2)
  };
}
