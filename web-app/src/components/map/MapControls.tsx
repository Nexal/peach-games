import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface LocationMarkerProps {
  watchPosition?: boolean;
}

export function LocationMarker({ watchPosition = true }: LocationMarkerProps) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      console.warn('Geolokalizacja nie jest wspierana przez tę przeglądarkę');
      return;
    }

    // Diagnostic: check permission state
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        console.log('[LocationMarker] Geolocation permission state:', result.state);
        result.addEventListener('change', () => {
          console.log('[LocationMarker] Geolocation permission changed to:', result.state);
        });
      }).catch((err) => {
        console.warn('[LocationMarker] Could not query permission state:', err);
      });
    }

    const successCallback = (pos: GeolocationPosition) => {
      const latlng: L.LatLngExpression = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };

      if (markerRef.current) {
        markerRef.current.setLatLng(latlng);
      } else {
        const userIcon = new L.Icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="#1565C0" stroke="#fff" stroke-width="2" opacity="0.3"/>
              <circle cx="12" cy="12" r="6" fill="#1565C0" stroke="#fff" stroke-width="2"/>
              <circle cx="12" cy="12" r="2" fill="#fff"/>
            </svg>
          `),
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        markerRef.current = L.marker(latlng, { icon: userIcon })
          .addTo(map)
          .bindPopup('Twoja lokalizacja');
      }
    };

    const errorCallback = (err: GeolocationPositionError) => {
      console.warn('Geolocation error:', err.message, 'code:', err.code);
    };

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    };

    if (watchPosition) {
      const watchId = navigator.geolocation.watchPosition(successCallback, errorCallback, options);
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
    }
  }, [map, watchPosition]);

  return null;
}

interface CenterOnLocationButtonProps {
  icon?: string;
  size?: number;
}

export function CenterOnLocationButton({ icon = '📍', size = 44 }: CenterOnLocationButtonProps) {
  const map = useMap();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!('geolocation' in navigator)) {
      setError('Brak wsparcia');
      return;
    }

    // Diagnostic: check permission state before requesting
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        console.log('[CenterButton] Geolocation permission state:', result.state);
        if (result.state === 'denied') {
          setError('🔒 Lokalizacja zablokowana. Wejdź w chrome://settings/content/location i włącz');
          return;
        }
      } catch {
        // permissions API not available
      }
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 17, {
          animate: true,
          duration: 0.5,
        });
        setLoading(false);
      },
      (err) => {
        setError(getErrorMessage(err));
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="map-controls">
      <button
        onClick={handleClick}
        disabled={loading}
        className="map-control-button"
        title="Centruj na mojej lokalizacji"
        style={{ width: size, height: size }}
      >
        {loading ? '⏳' : icon}
      </button>
      {error && <span className="map-control-error">{error}</span>}
    </div>
  );
}

function getErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return '📍 Lokalizacja zablokowana. Sprawdź: 1) GPS włączony w ustawieniach telefonu 2) Chrome ma pozwolenie na lokalizację w Ustawienia → Aplikacje → Chrome → Uprawnienia';
    case error.POSITION_UNAVAILABLE:
      return 'Lok. niedostępna';
    case error.TIMEOUT:
      return 'Timeout';
    default:
      return 'Błąd';
  }
}