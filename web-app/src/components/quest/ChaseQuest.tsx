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

export function useChaseQuest(quest: Quest, playerPosition: { lat: number; lng: number } | null) {
  const session = getPlayerSession();
  const [activeSession, setActiveSession] = useState<ChaseSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const markerIdRef = useRef<string | null>(null);

  const loadSession = useCallback(async () => {
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
      .limit(1);

    if (error) {
      console.error('[ChaseQuest] loadSession error', error);
    }

    setActiveSession(data?.[0] || null);
    setLoading(false);
  }, [quest.id, session?.klan_id, session?.game_id]);

  useEffect(() => {
    loadSession();

    const channel = supabase
      .channel(`chase-${quest.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chase_sessions',
          filter: `quest_id=eq.${quest.id}`,
        },
        () => {
          loadSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSession, quest.id]);

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    let intervalId: ReturnType<typeof setInterval>;

    const startTracking = async () => {
      const startLat = activeSession.start_lat;
      const startLng = activeSession.start_lng;
      const bearing = activeSession.bearing;
      const speedMps = activeSession.speed_mps;
      const startedAt = new Date(activeSession.started_at!).getTime();
      const catchDistance = activeSession.catch_distance_m || 20;

      const updatePosition = async () => {
        const now = Date.now();
        const elapsedSeconds = (now - startedAt) / 1000;

        const pos = calculatePosition(startLat, startLng, bearing, elapsedSeconds, speedMps);

        if (playerPosition) {
          const distance = getDistanceM(
            playerPosition.lat,
            playerPosition.lng,
            pos.lat,
            pos.lng
          );

          if (distance <= catchDistance) {
            clearInterval(intervalId);
            await handleComplete();
          }
        }
      };

      updatePosition();
      intervalId = setInterval(updatePosition, 1000);
    };

    startTracking();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeSession, playerPosition]);

  const handleComplete = async () => {
    if (!activeSession || !session?.id) return;

    const { error } = await supabase
      .from('chase_sessions')
      .update({
        completed_at: new Date().toISOString(),
        completed_by_player_id: session.id,
      })
      .eq('id', activeSession.id);

    if (!error) {
      await supabase.from('quest_completions').insert({
        quest_id: quest.id,
        klan_id: session.klan_id,
        game_id: session.game_id,
        metadata: {
          completed_by: session.id,
          player_name: session.name,
          chase_session_id: activeSession.id,
        },
      });

      const { data: klanData } = await supabase
        .from('klans')
        .select('points')
        .eq('id', session.klan_id)
        .limit(1);

      if (klanData && klanData[0]) {
        await supabase
          .from('klans')
          .update({
            points: (klanData[0].points || 0) + (activeSession.reward_points || 0),
          })
          .eq('id', session.klan_id);
      }

      if (markerIdRef.current) {
        await supabase
          .from('map_markers')
          .update({ is_active: false })
          .eq('id', markerIdRef.current);
        markerIdRef.current = null;
      }

      setActiveSession(null);
    }
  };

  const activate = async () => {
    if (!session?.klan_id || !session?.game_id || !playerPosition) return;

    setActivating(true);

    const randomBearing = Math.random() * 360;
    const randomSpeed = 1.5 + Math.random() * 1.5;
    const offsetMeters = 150 + Math.random() * 100;

    const startLat = playerPosition.lat + (offsetMeters / 111000) * Math.cos(randomBearing * Math.PI / 180);
    const startLng = playerPosition.lng + (offsetMeters / (111000 * Math.cos(playerPosition.lat * Math.PI / 180))) * Math.sin(randomBearing * Math.PI / 180);

    const { data: sessionData, error: sessionError } = await supabase
      .from('chase_sessions')
      .insert({
        quest_id: quest.id,
        klan_id: session.klan_id,
        game_id: session.game_id,
        start_lat: startLat,
        start_lng: startLng,
        bearing: randomBearing,
        speed_mps: randomSpeed,
      })
      .select()
      .limit(1);

    if (sessionError || !sessionData || !sessionData[0]) {
      console.error('[ChaseQuest] insert error', sessionError);
      setActivating(false);
      return;
    }

    const chaseSession = sessionData[0];

    const { data: markerData, error: markerError } = await supabase
      .from('map_markers')
      .insert({
        game_id: session.game_id,
        klan_id: session.klan_id,
        quest_id: quest.id,
        type: 'chase',
        title: 'Gooniec!',
        description: 'Gonitwa w toku! Złap gońca!',
        lat: startLat,
        lng: startLng,
        is_active: true,
      })
      .select()
      .limit(1);

    if (markerError) {
      console.error('[ChaseQuest] marker insert error', markerError);
    } else if (markerData && markerData[0]) {
      markerIdRef.current = markerData[0].id;
    }

    setActiveSession(chaseSession);
    setActivating(false);
  };

  return {
    activeSession,
    loading,
    activating,
    activate,
  };
}
