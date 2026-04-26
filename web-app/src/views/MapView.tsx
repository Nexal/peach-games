import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { usePlayerSession, useGame } from '../App';
import { supabase } from '../lib/supabase';
import type { MapMarker } from '../types/map.types';
import { DEFAULT_MAP_CONFIG, TILE_LAYERS } from '../types/map.types';
import { LocationMarker, CenterOnLocationButton } from '../components/map/MapControls';
import { AnimatedMarker, PulsingMarker } from '../components/map/AnimatedMarkers';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

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

const chaseIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#E74C3C" opacity="0.2"/>
      <circle cx="12" cy="12" r="7" fill="#E74C3C" opacity="0.4"/>
      <circle cx="12" cy="12" r="4" fill="#E74C3C"/>
      <path d="M12 6l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L7 9.5l3.5-.5z" fill="#FFD700"/>
    </svg>
  `),
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

function getDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusM = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusM * c;
}

function ChaseMarker({ questId }: { questId: string }) {
  const { activeQuests, completeChase, playerPosition } = useGame();
  const state = activeQuests[questId];

  useEffect(() => {
    if (!state?.position || !state?.session || !playerPosition) return;

    const distance = getDistanceM(
      playerPosition.lat, playerPosition.lng,
      state.position.lat, state.position.lng
    );

    if (distance <= (state.session.catch_distance_m || 20)) {
      completeChase(state.session.id, questId);
    }
  }, [state?.position, playerPosition, state?.session, completeChase, questId]);

  if (!state?.position) return null;

  return (
    <Marker position={state.position} icon={chaseIcon}>
      <Popup>
        <div className="map-popup map-popup--chase">
          <h3>🐎 Gonitwa!</h3>
          <p>Płań ku kóncu by schwytać!</p>
        </div>
      </Popup>
    </Marker>
  );
}

function MapContent() {
  const { session } = usePlayerSession();
  const { activeQuests, playerPosition } = useGame();
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [chaseQuestIds, setChaseQuestIds] = useState<string[]>([]);

  useEffect(() => {
    if (!session?.game_id) return;

    const fetchMarkers = async () => {
      const { data } = await supabase
        .from('map_markers')
        .select('*')
        .eq('game_id', session.game_id)
        .eq('is_active', true);

      if (data) {
        setMarkers(data.map(m => ({
          id: m.id,
          position: [m.lat ?? 0, m.lng ?? 0] as [number, number],
          title: m.title,
          description: m.description ?? undefined,
          type: m.type as 'quest' | 'base' | 'clan_base' | 'chase',
          clan_id: m.klan_id ?? undefined,
          icon_url: m.icon_url ?? undefined,
          is_active: m.is_active ?? true,
          quest_id: m.quest_id ?? undefined,
          reward_points: m.reward_points ?? undefined,
        })));
      }
    };

    fetchMarkers();

    const channel = supabase
      .channel('map_markers_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'map_markers',
        filter: `game_id=eq.${session.game_id}`,
      }, fetchMarkers)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.game_id]);

  useEffect(() => {
    if (!session?.game_id) return;

    supabase
      .from('quests')
      .select('id')
      .eq('game_id', session.game_id)
      .eq('type', 'chase')
      .then(({ data }) => {
        if (data) setChaseQuestIds(data.map(q => q.id));
      });
  }, [session?.game_id]);

  return (
    <>
      <TileLayer url={TILE_LAYERS.dark.url} attribution={TILE_LAYERS.dark.attribution} />
      <LocationMarker watchPosition={true} />
      <AnimatedMarker center={DEFAULT_MAP_CONFIG.center} orbitRadius={100} speed={0.5} />
      <PulsingMarker position={DEFAULT_MAP_CONFIG.center} />

      <Marker position={DEFAULT_MAP_CONFIG.center} icon={baseIcon}>
        <Popup>
          <div className="map-popup map-popup--base">
            <h3>🔥 Ognisko / Baza</h3>
            <p>Centrum wydarzenia - Noc Kupały</p>
          </div>
        </Popup>
      </Marker>

      {chaseQuestIds.map(id => (
        <ChaseMarker key={id} questId={id} />
      ))}

      {markers.map((marker) => {
        let icon = questIcon;
        if (marker.type === 'clan_base') icon = clanIcon;
        if (marker.type === 'chase') icon = chaseIcon;

        if (marker.type === 'quest' && marker.clan_id && marker.clan_id !== session?.klan_id) return null;
        if (marker.type === 'chase' && marker.clan_id && marker.clan_id !== session?.klan_id) return null;

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