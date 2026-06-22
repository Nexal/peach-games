import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { getPlayerSession } from '../../lib/playerSession';
import type { Database } from '../../types/database.types';

type Quest = Database['public']['Tables']['quests']['Row'];
type ChaseSession = Database['public']['Tables']['chase_sessions']['Row'];

function calculatePosition(
  startLat: number,
  startLng: number,
  bearing: number,
  elapsedSeconds: number,
  speedMps: number
): { lat: number; lng: number } {
  const distanceM = elapsedSeconds * speedMps;
  const earthRadiusM = 6371000;

  const lat1 = (startLat * Math.PI) / 180;
  const lng1 = (startLng * Math.PI) / 180;
  const bearingRad = (bearing * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceM / earthRadiusM) +
    Math.cos(lat1) * Math.sin(distanceM / earthRadiusM) * Math.cos(bearingRad)
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distanceM / earthRadiusM) * Math.cos(lat1),
      Math.cos(distanceM / earthRadiusM) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  };
}

function getDistanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const earthRadiusM = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusM * c;
}

type ChaseBroadcast = {
  type: 'activated' | 'completed';
  quest_id: string;
  klan_id: string;
  start_lat?: number;
  start_lng?: number;
  bearing?: number;
  speed_mps?: number;
  started_at?: string;
};

export function useChaseQuest(quest: Quest, playerPosition: { lat: number; lng: number } | null) {
  const session = getPlayerSession();
  const [activeSession, setActiveSession] = useState<ChaseSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((chaseSession: ChaseSession) => {
    clearTimer();

    const startedAt = new Date(chaseSession.started_at!).getTime();
    const catchDistance = chaseSession.catch_distance_m || 20;

    const tick = () => {
      const now = Date.now();
      const elapsedSeconds = (now - startedAt) / 1000;

      const pos = calculatePosition(
        chaseSession.start_lat,
        chaseSession.start_lng,
        chaseSession.bearing,
        elapsedSeconds,
        chaseSession.speed_mps
      );
      setMarkerPosition(pos);

      if (playerPosition) {
        const distance = getDistanceM(
          playerPosition.lat,
          playerPosition.lng,
          pos.lat,
          pos.lng
        );

        if (distance <= catchDistance) {
          clearTimer();
          handleComplete(chaseSession);
        }
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
  }, [playerPosition, clearTimer]);

  const handleComplete = async (chaseSession: ChaseSession) => {
    if (!session?.id) return;

    const { error } = await supabase
      .from('chase_sessions')
      .update({
        completed_at: new Date().toISOString(),
        completed_by_player_id: session.id,
      })
      .eq('id', chaseSession.id);

    if (!error) {
      await supabase.from('quest_completions').insert({
        quest_id: quest.id,
        klan_id: session.klan_id,
        game_id: session.game_id,
        metadata: {
          completed_by: session.id,
          player_name: session.name,
        },
      });

      const { data: klanData } = await supabase
        .from('klans')
        .select('points')
        .eq('id', session.klan_id)
        .limit(1);

      if (klanData?.[0]) {
        await supabase
          .from('klans')
          .update({
            points: (klanData[0].points || 0) + (chaseSession.reward_points || 0),
          })
          .eq('id', session.klan_id);
      }

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'chase_update',
          payload: {
            type: 'completed',
            quest_id: quest.id,
            klan_id: session.klan_id,
          } as ChaseBroadcast,
        });
      }

      setActiveSession(null);
      setMarkerPosition(null);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      if (!session?.klan_id || !session?.game_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('chase_sessions')
        .select('*')
        .eq('quest_id', quest.id)
        .eq('klan_id', session.klan_id)
        .is('completed_at', null)
        .maybeSingle();

      if (error) {
        console.error('[ChaseQuest] loadSession error', error);
      }

      setActiveSession(data || null);
      setLoading(false);

      if (data) {
        startTimer(data);
      }
    };

    loadSession();

    channelRef.current = supabase.channel(`chase-${quest.id}`);

    channelRef.current
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chase_sessions',
        filter: `quest_id=eq.${quest.id}`,
      }, () => {
        loadSession();
      })
      .on('broadcast', { event: 'chase_update' }, (payload) => {
        const msg = payload.payload as ChaseBroadcast;
        if (msg.type === 'activated' && msg.quest_id === quest.id) {
          const newSession: ChaseSession = {
            id: '',
            quest_id: quest.id,
            klan_id: msg.klan_id,
            game_id: session?.game_id || '',
            start_lat: msg.start_lat!,
            start_lng: msg.start_lng!,
            bearing: msg.bearing!,
            speed_mps: msg.speed_mps!,
            started_at: msg.started_at!,
            completed_at: null,
            completed_by_player_id: null,
            catch_distance_m: 20,
            reward_points: 100,
            task_id: null,
            trajectory: null,
            icon_url: null,
          };
          setActiveSession(newSession);
          startTimer(newSession);
        } else if (msg.type === 'completed' && msg.quest_id === quest.id) {
          clearTimer();
          setActiveSession(null);
          setMarkerPosition(null);
        }
      })
      .subscribe();

    return () => {
      clearTimer();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [quest.id, session?.klan_id, session?.game_id]);

  useEffect(() => {
    if (activeSession && !timerRef.current) {
      startTimer(activeSession);
    }
  }, [activeSession, startTimer]);

  const activate = async () => {
    if (!session?.klan_id || !session?.game_id || !playerPosition) return;

    setActivating(true);

    const randomBearing = Math.random() * 360;
    const randomSpeed = 15 + Math.random() * 10; // 15-25 m/s for testing
    const offsetMeters = 150 + Math.random() * 100;

    const startLat = playerPosition.lat + (offsetMeters / 111000) * Math.cos(randomBearing * Math.PI / 180);
    const startLng = playerPosition.lng + (offsetMeters / (111000 * Math.cos(playerPosition.lat * Math.PI / 180))) * Math.sin(randomBearing * Math.PI / 180);
    const startedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('chase_sessions')
      .insert({
        quest_id: quest.id,
        klan_id: session.klan_id,
        game_id: session.game_id,
        start_lat: startLat,
        start_lng: startLng,
        bearing: randomBearing,
        speed_mps: randomSpeed,
        started_at: startedAt,
      })
      .select()
      .maybeSingle();

    if (error || !data) {
      console.error('[ChaseQuest] insert error', error);
      setActivating(false);
      return;
    }

    const newSession = data;

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chase_update',
        payload: {
          type: 'activated',
          quest_id: quest.id,
          klan_id: session.klan_id,
          start_lat: startLat,
          start_lng: startLng,
          bearing: randomBearing,
          speed_mps: randomSpeed,
          started_at: startedAt,
        } as ChaseBroadcast,
      });
    }

    setActiveSession(newSession);
    startTimer(newSession);
    setActivating(false);
  };

  return {
    activeSession,
    markerPosition,
    loading,
    activating,
    activate,
  };
}
