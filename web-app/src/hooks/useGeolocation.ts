import { useEffect, useState, useCallback } from 'react';

interface Position {
  lat: number;
  lng: number;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
    ...options,
  };

  const startWatching = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolokalizacja nie jest wspierana przez tę przeglądarkę');
      return;
    }

    setLoading(true);
    setError(null);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(getErrorMessage(err));
        setLoading(false);
      },
      defaultOptions
    );

    setWatchId(id);
  }, []);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  const getCurrentPosition = useCallback((): Promise<Position> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolokalizacja nie jest wspierana'));
        return;
      }

      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const posObj = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(posObj);
          setLoading(false);
          resolve(posObj);
        },
        (err) => {
          setError(getErrorMessage(err));
          setLoading(false);
          reject(new Error(getErrorMessage(err)));
        },
        defaultOptions
      );
    });
  }, []);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    position,
    error,
    loading,
    startWatching,
    stopWatching,
    getCurrentPosition,
  };
}

function getErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Brak pozwolenia na dostęp do lokalizacji. Włącz w ustawieniach przeglądarki.';
    case error.POSITION_UNAVAILABLE:
      return 'Lokalizacja niedostępna. Spróbuj ponownie.';
    case error.TIMEOUT:
      return 'Upłynął limit czasu pobierania lokalizacji.';
    default:
      return 'Nieznany błąd geolokalizacji.';
  }
}