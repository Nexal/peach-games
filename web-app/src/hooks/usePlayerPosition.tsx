import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePlayerSession } from '../App';
import { supabase } from '../lib/supabase';

interface PositionUpdate {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface PlayerPositionContextValue {
  position: PositionUpdate | null;
}

const PlayerPositionContext = createContext<PlayerPositionContextValue>({ position: null });

function useGeolocation() {
  const { session } = usePlayerSession();
  const lastPositionRef = useRef<PositionUpdate | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return { session, lastPositionRef, watchIdRef, calculateDistance };
}

export function PlayerPositionProvider({ children }: { children: React.ReactNode }) {
  const { session } = useGeolocation();
  const [position, setPosition] = useState<PositionUpdate | null>(null);

  useEffect(() => {
    if (!session?.id || !session?.game_id) return;
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPosition: PositionUpdate = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setPosition(newPosition);

        const playerId = session?.player_id || session?.id;
        if (playerId && session?.game_id) {
          supabase.from('player_positions').upsert({
            player_id: playerId,
            game_id: session.game_id,
            lat: newPosition.lat,
            lng: newPosition.lng,
            accuracy: newPosition.accuracy,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'player_id,game_id' });
        }
      },
      (err) => console.warn('Provider initial geolocation error:', err),
      { enableHighAccuracy: true, timeout: 10000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPosition: PositionUpdate = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };

        setPosition((prev) => {
          if (!prev) return newPosition;

          const R = 6371000;
          const dLat = (newPosition.lat - prev.lat) * Math.PI / 180;
          const dLng = (newPosition.lng - prev.lng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(prev.lat * Math.PI / 180) * Math.cos(newPosition.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
          const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          if (distance >= 10) {
            const playerId = session?.player_id || session?.id;
            if (playerId && session?.game_id) {
              supabase.from('player_positions').upsert({
                player_id: playerId,
                game_id: session.game_id,
                lat: newPosition.lat,
                lng: newPosition.lng,
                accuracy: newPosition.accuracy,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'player_id,game_id' });
            }
            return newPosition;
          }
          return prev;
        });
      },
      (err) => console.warn('Provider watch position error:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [session?.id, session?.game_id, session?.player_id]);

  return (
    <PlayerPositionContext.Provider value={{ position }}>
      {children}
    </PlayerPositionContext.Provider>
  );
}

export function usePlayerPosition(options: { minDistance?: number; enabled?: boolean; onPositionUpdate?: (position: PositionUpdate | null) => void } = {}) {
  const { onPositionUpdate } = options;
  const { position } = useContext(PlayerPositionContext);

  useEffect(() => {
    if (position && onPositionUpdate) {
      onPositionUpdate(position);
    }
  }, [position, onPositionUpdate]);

  return { position, currentPosition: position };
}

export function useGamePlayerPositions(gameId: string | undefined) {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const fetchPositions = async () => {
      const { data, error } = await supabase
        .from('player_positions')
        .select(`
          player_id,
          lat,
          lng,
          accuracy,
          updated_at,
          players:player_id (
            id,
            name,
            klan_id,
            klans:klan_id (
              id,
              name
            )
          )
        `)
        .eq('game_id', gameId)
        .gt('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order('updated_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        const transformed: any[] = (data || []).map((p: any) => ({
          player_id: p.player_id,
          player_name: p.players?.name || 'Nieznany',
          klan_id: p.players?.klan_id || null,
          klan_name: p.players?.klans?.name || null,
          lat: p.lat,
          lng: p.lng,
          accuracy: p.accuracy,
          updated_at: p.updated_at,
        }));
        setPositions(transformed);
      }
      setLoading(false);
    };

    fetchPositions();

    const channel = supabase
      .channel('player_positions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_positions',
        filter: `game_id=eq.${gameId}`,
      }, () => {
        fetchPositions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { positions, loading, error };
}