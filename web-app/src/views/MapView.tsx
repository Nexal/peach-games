import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import { usePlayerSession } from '../App';
import { supabase } from '../lib/supabase';
import type { MapMarker } from '../types/map.types';
import { DEFAULT_MAP_CONFIG, TILE_LAYERS } from '../types/map.types';
import { LocationMarker, CenterOnLocationButton } from '../components/map/MapControls';
import { AnimatedMarker, PulsingMarker } from '../components/map/AnimatedMarkers';
import { usePlayerPosition } from '../hooks/usePlayerPosition';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Base marker icon (orange/ campfire)
const baseIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
      <path fill="#E74C3C" d="M12 2C8.5 6 5 9 5 13c0 4.4 3.1 7.5 7 7.5s7-3.1 7-7.5c0-4-3.5-7-7-11z"/>
      <path fill="#FFD700" d="M12 5c-2 3-4 5-4 7.5 0 2.2 1.8 4 4 4s4-1.8 4-4c0-2.5-2-4.5-4-7.5z"/>
      <path fill="#fff" d="M12 8c-1 1.5-2 2.5-2 3.75 0 1.1.9 2 2 2s2-.9 2-2c0-1.25-1-2.25-2-3.75z"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Quest marker icon (gold)
const questIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#FFD700" opacity="0.3"/>
      <circle cx="12" cy="12" r="7" fill="#FFD700" opacity="0.5"/>
      <circle cx="12" cy="12" r="4" fill="#FFD700"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Clan base marker
const clanIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="#8A2BE2" opacity="0.5"/>
      <path d="M12 5L5 9v6l7 3.5 7-3.5V9L12 5z" fill="#8A2BE2"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

function MapContent() {
  const { session } = usePlayerSession();
  const [markers, setMarkers] = useState<MapMarker[]>([]);

  // Send player position to database every ~10 seconds
  usePlayerPosition({ minDistance: 10 });

  useEffect(() => {
    if (!session?.game_id) return;

    const fetchMarkers = async () => {
      const { data, error } = await supabase
        .from('map_markers')
        .select('*')
        .eq('game_id', session.game_id)
        .eq('is_active', true);

      if (!error && data) {
        const mapped: MapMarker[] = data.map(m => ({
          id: m.id,
          position: [m.lat ?? 0, m.lng ?? 0] as [number, number],
          title: m.title,
          description: m.description ?? undefined,
          type: m.type as 'quest' | 'base' | 'clan_base',
          clan_id: m.klan_id ?? undefined,
          icon_url: m.icon_url ?? undefined,
          is_active: m.is_active ?? true,
          quest_id: m.quest_id ?? undefined,
          reward_points: m.reward_points ?? undefined,
        }));
        setMarkers(mapped);
      }
    };

    fetchMarkers();

    // Subscribe to changes
    const channel = supabase
      .channel('map_markers_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'map_markers',
        filter: `game_id=eq.${session.game_id}`,
      }, () => {
        fetchMarkers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.game_id]);

  return (
    <>
      <TileLayer
        url={TILE_LAYERS.dark.url}
        attribution={TILE_LAYERS.dark.attribution}
      />

      {/* User's current location */}
      <LocationMarker watchPosition={true} />

      {/* Animated markers - experimental */}
      <AnimatedMarker center={DEFAULT_MAP_CONFIG.center} orbitRadius={100} speed={0.5} />
      <PulsingMarker position={DEFAULT_MAP_CONFIG.center} />

      {/* Base marker - always shown */}
      <Marker position={DEFAULT_MAP_CONFIG.center} icon={baseIcon}>
        <Popup>
          <div className="map-popup map-popup--base">
            <h3>🔥 Ognisko / Baza</h3>
            <p>Centrum wydarzenia - Noc Kupały</p>
          </div>
        </Popup>
      </Marker>

      {/* Dynamic markers from database */}
      {markers.map((marker) => {
        let icon = questIcon;
        if (marker.type === 'clan_base') icon = clanIcon;

        // Filter by clan for quest markers (only show own clan's quests)
        if (marker.type === 'quest' && marker.clan_id && marker.clan_id !== session?.klan_id) {
          return null;
        }

        return (
          <Marker key={marker.id} position={marker.position} icon={icon}>
            <Popup>
              <div className={`map-popup map-popup--${marker.type}`}>
                <h3>{marker.title}</h3>
                {marker.description && <p>{marker.description}</p>}
                {marker.type === 'quest' && marker.reward_points && (
                  <span className="map-popup__reward">+{marker.reward_points} pkt</span>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Center on location button */}
      <CenterOnLocationButton />
    </>
  );
}

export function MapView() {
  return (
    <div className="view view--map">
      <header className="view__header">
        <h1 className="view__title view__title--small">🗺️ Mapa</h1>
        <p className="view__subtitle">Twoje questy i lokalizacje</p>
      </header>

      <main className="view__content view__content--map">
        <div className="map-container">
          <MapContainer
            center={DEFAULT_MAP_CONFIG.center}
            zoom={DEFAULT_MAP_CONFIG.zoom}
            maxZoom={DEFAULT_MAP_CONFIG.maxZoom}
            minZoom={DEFAULT_MAP_CONFIG.minZoom}
            className="leaflet-map"
            zoomControl={true}
            attributionControl={false}
          >
            <MapContent />
          </MapContainer>
        </div>
      </main>
    </div>
  );
}