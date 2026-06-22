import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerSession } from '../App';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';

type ChaseSession = Database['public']['Tables']['chase_sessions']['Row'];

type MarkerPosition = { lat: number; lng: number } | null;

interface ChaseContextValue {
  getMarkerPosition: (questId: string) => MarkerPosition;
  getSession: (questId: string) => ChaseSession | null;
  onCatch: (chaseId: string, questId: string) => Promise<void>;
  subscribeToChase: (questId: string, callback: (pos: MarkerPosition) => void) => () => void;
}

const ChaseContext = createContext<ChaseContextValue>({
  getMarkerPosition: () => null,
  getSession: () => null,
  onCatch: async () => {},
  subscribeToChase: () => () => {},
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

function calculatePositionFromTrajectory(
  trajectory: { lat: number; lng: number }[],
  elapsedSeconds: number,
  speedMps: number
): { lat: number; lng: number } {
  if (trajectory.length < 2) return trajectory[0] || { lat: 0, lng: 0 };

  let totalLength = 0;
  for (let i = 1; i < trajectory.length; i++) {
    totalLength += getDistanceM(
      trajectory[i - 1].lat, trajectory[i - 1].lng,
      trajectory[i].lat, trajectory[i].lng
    );
  }
  if (totalLength === 0) return trajectory[0];

  const distanceTraveled = (elapsedSeconds * speedMps) % totalLength;
  let accumulatedDistance = 0;

  for (let i = 1; i < trajectory.length; i++) {
    const segmentDistance = getDistanceM(
      trajectory[i - 1].lat, trajectory[i - 1].lng,
      trajectory[i].lat, trajectory[i].lng
    );

    if (accumulatedDistance + segmentDistance >= distanceTraveled) {
      const remainingDistance = distanceTraveled - accumulatedDistance;
      const ratio = remainingDistance / segmentDistance;

      return {
        lat: trajectory[i - 1].lat + (trajectory[i].lat - trajectory[i - 1].lat) * ratio,
        lng: trajectory[i - 1].lng + (trajectory[i].lng - trajectory[i - 1].lng) * ratio,
      };
    }

    accumulatedDistance += segmentDistance;
  }

  return trajectory[trajectory.length - 1];
}

interface ChaseState {
  session: ChaseSession | null;
  trajectory: { lat: number; lng: number }[] | null;
  position: MarkerPosition;
}

export function ChaseProvider({ children }: { children: React.ReactNode }) {
  const { session } = usePlayerSession();
  const [chaseStates, setChaseStates] = useState<Record<string, ChaseState>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subscribersRef = useRef<Record<string, Set<(pos: MarkerPosition) => void>>>({});

  const notifySubscribers = useCallback((questId: string, pos: MarkerPosition) => {
    subscribersRef.current[questId]?.forEach(cb => cb(pos));
  }, []);

  const tick = useCallback(() => {
    setChaseStates(prev => {
      const next = { ...prev };
      let hasChanges = false;

      for (const [questId, state] of Object.entries(prev)) {
        if (!state.session || state.session.completed_at) continue;
        if (!state.trajectory || state.trajectory.length < 2) continue;

        const startedAt = new Date(state.session.started_at!).getTime();
        const elapsedSeconds = (Date.now() - startedAt) / 1000;
        const newPos = calculatePositionFromTrajectory(state.trajectory, elapsedSeconds, state.session.speed_mps);

        if (newPos.lat !== state.position?.lat || newPos.lng !== state.position?.lng) {
          next[questId] = { ...state, position: newPos };
          hasChanges = true;
          notifySubscribers(questId, newPos);
        }
      }

      return hasChanges ? next : prev;
    });
  }, [notifySubscribers]);

  useEffect(() => {
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tick]);

  useEffect(() => {
    if (!session?.klan_id || !session?.game_id) return;

    const loadActiveChases = async () => {
      const { data, error } = await supabase
        .from('chase_sessions')
        .select('*, quests:quest_id(trajectory)')
        .eq('klan_id', session.klan_id)
        .is('completed_at', null);

      if (error) {
        console.error('[ChaseProvider] loadActiveChases error:', error);
        return;
      }

      if (!data) return;

      const states: Record<string, ChaseState> = {};
      for (const row of data as any[]) {
        const trajectory = row.quests?.trajectory
          ? (typeof row.quests.trajectory === 'string'
              ? JSON.parse(row.quests.trajectory)
              : row.quests.trajectory)
          : null;

        const startedAt = new Date(row.started_at).getTime();
        const elapsedSeconds = (Date.now() - startedAt) / 1000;
        const position = trajectory
          ? calculatePositionFromTrajectory(trajectory, elapsedSeconds, row.speed_mps)
          : null;

        states[row.quest_id] = {
          session: row as ChaseSession,
          trajectory,
          position,
        };

        subscribersRef.current[row.quest_id] = new Set();
      }

      setChaseStates(states);
    };

    loadActiveChases();

    const channel = supabase
      .channel('chase_provider_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chase_sessions',
        filter: `klan_id=eq.${session.klan_id}`,
      }, async (payload: any) => {
        const row = payload.new as any;
        const questId = row.quest_id;

        if (payload.eventType === 'INSERT' && !row.completed_at) {
          const { data: questData } = await supabase
            .from('quests')
            .select('trajectory')
            .eq('id', questId)
            .single();

          const trajectory = questData?.trajectory
            ? (typeof questData.trajectory === 'string'
                ? JSON.parse(questData.trajectory)
                : questData.trajectory)
            : null;

          const startedAt = new Date(row.started_at).getTime();
          const elapsedSeconds = (Date.now() - startedAt) / 1000;
          const position = trajectory
            ? calculatePositionFromTrajectory(trajectory, elapsedSeconds, row.speed_mps)
            : null;

          setChaseStates(prev => ({
            ...prev,
            [questId]: {
              session: row as ChaseSession,
              trajectory,
              position,
            },
          }));

          subscribersRef.current[questId] = new Set();
          notifySubscribers(questId, position);
        } else if (payload.eventType === 'UPDATE' && row.completed_at) {
          setChaseStates(prev => {
            const next = { ...prev };
            delete next[questId];
            return next;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.klan_id, session?.game_id, notifySubscribers]);

  const getMarkerPosition = useCallback((questId: string): MarkerPosition => {
    return chaseStates[questId]?.position || null;
  }, [chaseStates]);

  const getSession = useCallback((questId: string): ChaseSession | null => {
    return chaseStates[questId]?.session || null;
  }, [chaseStates]);

  const onCatch = useCallback(async (chaseId: string, questId: string) => {
    if (!session?.id) return;

    const state = chaseStates[questId];
    if (!state?.session) return;

    const { error } = await supabase
      .from('chase_sessions')
      .update({
        completed_at: new Date().toISOString(),
        completed_by_player_id: session.id,
      })
      .eq('id', chaseId);

    if (error) {
      console.error('[ChaseProvider] onCatch update error:', error);
      return;
    }

    await supabase.from('quest_completions').insert({
      quest_id: questId,
      klan_id: session.klan_id,
      game_id: session.game_id,
      metadata: { completed_by: session.id, player_name: session.name },
    });

    await supabase.rpc('award_clan_points', {
      p_klan_id: session.klan_id,
      p_base_points: state.session.reward_points || 0,
    });
  }, [session, chaseStates]);

  const subscribeToChase = useCallback((questId: string, callback: (pos: MarkerPosition) => void) => {
    if (!subscribersRef.current[questId]) {
      subscribersRef.current[questId] = new Set();
    }
    subscribersRef.current[questId].add(callback);

    if (chaseStates[questId]?.position) {
      callback(chaseStates[questId].position);
    }

    return () => {
      subscribersRef.current[questId]?.delete(callback);
    };
  }, [chaseStates]);

  return (
    <ChaseContext.Provider value={{ getMarkerPosition, getSession, onCatch, subscribeToChase }}>
      {children}
    </ChaseContext.Provider>
  );
}

export function useChase(questId: string) {
  const { getMarkerPosition, getSession, onCatch, subscribeToChase } = useContext(ChaseContext);
  const [position, setPosition] = useState<MarkerPosition>(null);
  const [session, setSession] = useState<ChaseSession | null>(null);

  useEffect(() => {
    const initial = getMarkerPosition(questId);
    const initialSession = getSession(questId);
    if (initial) setPosition(initial);
    if (initialSession) setSession(initialSession);

    return subscribeToChase(questId, (pos) => {
      setPosition(pos);
      const sess = getSession(questId);
      setSession(sess);
    });
  }, [questId, getMarkerPosition, getSession, subscribeToChase]);

  return {
    position,
    session,
    onCatch: (chaseId: string) => onCatch(chaseId, questId),
  };
}