import { useEffect, useRef, useCallback, useState } from 'react';
import { usePlayerSession } from '../App';
import { supabase } from '../lib/supabase';

interface PositionUpdate {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface PlayerPosition {
  player_id: string;
  player_name: string;
  klan_id: string | null;
  klan_name: string | null;
  lat: number;
  lng: number;
  accuracy: number | null;
  updated_at: string;
}

interface UsePlayerPositionOptions {
  sendInterval?: number;
  minDistance?: number;
  enabled?: boolean;
}

export function usePlayerPosition(options: UsePlayerPositionOptions = {}) {
  const { minDistance = 10, enabled = true } = options;
  const { session } = usePlayerSession();
  const lastPositionRef = useRef<PositionUpdate | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [currentPosition, setCurrentPosition] = useState<PositionUpdate | null>(null);

  const sendPosition = useCallback(async (position: PositionUpdate) => {
    const playerId = session?.player_id || session?.id;
    if (!playerId || !session?.game_id) return;

    if (position.accuracy && position.accuracy > 100) return;

    setCurrentPosition(position);

    // Upsert position directly
    const { error } = await supabase.from('player_positions').upsert({
      player_id: playerId,
      game_id: session.game_id,
      lat: position.lat,
      lng: position.lng,
      accuracy: position.accuracy,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'player_id,game_id',
    });

    if (error) {
      console.warn('Failed to send position:', error);
    }
  }, [session?.player_id, session?.id, session?.game_id]);

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

  useEffect(() => {
    if (!enabled || !session?.id || !session?.game_id) return;
    if (!('geolocation' in navigator)) return;

    // Send initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const position: PositionUpdate = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        lastPositionRef.current = position;
        sendPosition(position);
      },
      (err) => console.warn('Initial geolocation error:', err),
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Start watching
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const position: PositionUpdate = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };

        const last = lastPositionRef.current;
        const distance = last ? calculateDistance(last.lat, last.lng, position.lat, position.lng) : Infinity;
        const shouldSend = distance >= minDistance;

        if (shouldSend) {
          lastPositionRef.current = position;
          sendPosition(position);
        }
      },
      (err) => console.warn('Watch position error:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled, session?.id, session?.player_id, session?.game_id, minDistance, sendPosition]);

  return currentPosition;
}

export function useGamePlayerPositions(gameId: string | undefined) {
  const [positions, setPositions] = useState<PlayerPosition[]>([]);
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
        // Transform the nested data
        const transformed: PlayerPosition[] = (data || []).map((p: any) => ({
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

    // Real-time subscription
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