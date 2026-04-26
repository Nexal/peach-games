import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerSession } from '../App';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import '../styles/CompletionModal.css';

type ChaseSession = Database['public']['Tables']['chase_sessions']['Row'];
type Quest = Database['public']['Tables']['quests']['Row'];
type QuestCompletion = Database['public']['Tables']['quest_completions']['Row'];

type MarkerPosition = { lat: number; lng: number } | null;

interface QuestCompletionData {
  id: string;
  quest_id: string;
  quest_name: string;
  points: number;
  player_name: string;
  klan_name: string;
  completed_at: string;
  klan_color?: string;
}

interface GameContextValue {
  playerPosition: MarkerPosition;
  activeQuests: Record<string, QuestState>;
  completionModal: QuestCompletionData | null;
  dismissCompletion: () => void;
  completeChase: (chaseId: string, questId: string) => Promise<void>;
  activateQuest: (questId: string) => Promise<void>;
  getMarkerPosition: (questId: string) => MarkerPosition;
}

interface QuestState {
  session: ChaseSession | null;
  trajectory: { lat: number; lng: number }[] | null;
  position: MarkerPosition;
}

const GameContext = createContext<GameContextValue>({
  playerPosition: null,
  activeQuests: {},
  completionModal: null,
  dismissCompletion: () => {},
  completeChase: async () => {},
  activateQuest: async () => {},
  getMarkerPosition: () => null,
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

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { session } = usePlayerSession();
  const [playerPosition, setPlayerPosition] = useState<MarkerPosition>(null);
  const [activeQuests, setActiveQuests] = useState<Record<string, QuestState>>({});
  const [completionModal, setCompletionModal] = useState<QuestCompletionData | null>(null);
  const lastPlayerPositionRef = useRef<MarkerPosition>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!session?.id || !session?.game_id) return;
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        lastPlayerPositionRef.current = newPos;
        setPlayerPosition(newPos);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!lastPlayerPositionRef.current ||
            getDistanceM(lastPlayerPositionRef.current.lat, lastPlayerPositionRef.current.lng, newPos.lat, newPos.lng) >= 10) {
          lastPlayerPositionRef.current = newPos;
          setPlayerPosition(newPos);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [session?.id, session?.game_id]);

  useEffect(() => {
    const tick = () => {
      setActiveQuests(prev => {
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
          }
        }

        return hasChanges ? next : prev;
      });
    };

    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!session?.klan_id || !session?.game_id) return;

    const loadActiveQuests = async () => {
      const { data, error } = await supabase
        .from('chase_sessions')
        .select('*, quests:quest_id(trajectory)')
        .eq('klan_id', session.klan_id)
        .is('completed_at', null);

      if (error) return;
      if (!data) return;

      const states: Record<string, QuestState> = {};
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

        states[row.quest_id] = { session: row as ChaseSession, trajectory, position };
      }

      setActiveQuests(states);
    };

    loadActiveQuests();

    const channel = supabase
      .channel('game_provider_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chase_sessions',
        filter: `klan_id=eq.${session.klan_id}`,
      }, async (payload: any) => {
        const row = payload.new;
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

          setActiveQuests(prev => ({
            ...prev,
            [questId]: { session: row as ChaseSession, trajectory, position },
          }));
        } else if (payload.eventType === 'UPDATE' && row.completed_at) {
          setActiveQuests(prev => {
            const next = { ...prev };
            delete next[questId];
            return next;
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.klan_id, session?.game_id]);

  useEffect(() => {
    if (!session?.klan_id) {
      console.log('[GameProvider] No klan_id, skipping quest completions subscription');
      return;
    }

    console.log('[GameProvider] Subscribing to quest completions for klan:', session.klan_id);

    const channel = supabase
      .channel(`klan_${session.klan_id}_completions`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quest_completions',
      }, async (payload: any) => {
        console.log('[GameProvider] Postgres change:', payload.eventType, payload.new?.id, 'klan:', payload.new?.klan_id);
        if (!payload.new || payload.new.klan_id !== session.klan_id) {
          console.log('[GameProvider] Ignoring event');
          return;
        }
        console.log('[GameProvider] Processing completion for our klan');
        const completion = payload.new as any;
        console.log('[GameProvider] Quest completion:', completion);

        let questName = 'Quest';
        let playerName = 'Administrator';

        const [questRes, playerRes] = await Promise.all([
          supabase.from('quests').select('title').eq('id', completion.quest_id).single(),
          completion.completed_by_player_id
            ? supabase.from('players').select('name').eq('id', completion.completed_by_player_id).single()
            : Promise.resolve({ data: null })
        ]);

        if (questRes.data) questName = questRes.data.title;
        if (playerRes.data) playerName = playerRes.data.name;

        setCompletionModal({
          id: completion.id,
          quest_id: completion.quest_id,
          quest_name: questName,
          points: completion.points_awarded || 0,
          player_name: playerName,
          klan_name: session?.klan_name || 'Klan',
          completed_at: completion.completed_at || new Date().toISOString(),
          klan_color: session?.klan_color || '#FFD700',
        });
        console.log('[GameProvider] Completion modal set');
      })
      .subscribe();
    console.log('[GameProvider] Channel subscribed');

    return () => { supabase.removeChannel(channel); };
  }, [session?.klan_id]);

  const completeChase = useCallback(async (chaseId: string, questId: string) => {
    if (!session?.id) return;

    const state = activeQuests[questId];
    if (!state?.session) return;

    const { error } = await supabase
      .from('chase_sessions')
      .update({
        completed_at: new Date().toISOString(),
        completed_by_player_id: session.id,
      })
      .eq('id', chaseId);

    if (error) { console.error('[GameProvider] completeChase error:', error); return; }

    await supabase.from('quest_completions').insert({
      quest_id: questId,
      klan_id: session.klan_id,
      game_id: session.game_id,
      completed_by_player_id: session.id,
      points_awarded: state.session.reward_points || 0,
    });

    const { data: klanData } = await supabase
      .from('klans')
      .select('points')
      .eq('id', session.klan_id)
      .single();

    if (klanData) {
      await supabase
        .from('klans')
        .update({ points: (klanData.points || 0) + (state.session.reward_points || 0) })
        .eq('id', session.klan_id);
    }
  }, [session, activeQuests]);

  const activateQuest = useCallback(async (questId: string) => {
    if (!session?.id || !playerPosition) return;

    const randomBearing = Math.random() * 360;
    const randomSpeed = 15 + Math.random() * 10;
    const offsetMeters = 150 + Math.random() * 100;

    const startLat = playerPosition.lat + (offsetMeters / 111000) * Math.cos(randomBearing * Math.PI / 180);
    const startLng = playerPosition.lng + (offsetMeters / (111000 * Math.cos(playerPosition.lat * Math.PI / 180))) * Math.sin(randomBearing * Math.PI / 180);

    const { data, error } = await supabase
      .from('chase_sessions')
      .insert({
        quest_id: questId,
        klan_id: session.klan_id,
        game_id: session.game_id,
        start_lat: startLat,
        start_lng: startLng,
        bearing: randomBearing,
        speed_mps: randomSpeed,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) { console.error('[GameProvider] activateQuest error:', error); return; }

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

    const startedAt = new Date(data.started_at).getTime();
    const elapsedSeconds = (Date.now() - startedAt) / 1000;
    const position = trajectory
      ? calculatePositionFromTrajectory(trajectory, elapsedSeconds, data.speed_mps)
      : null;

    setActiveQuests(prev => ({
      ...prev,
      [questId]: { session: data, trajectory, position },
    }));
  }, [session, playerPosition]);

  const dismissCompletion = useCallback(() => {
    setCompletionModal(null);
  }, []);

  const getMarkerPosition = useCallback((questId: string): MarkerPosition => {
    return activeQuests[questId]?.position || null;
  }, [activeQuests]);

  return (
    <GameContext.Provider value={{
      playerPosition,
      activeQuests,
      completionModal,
      dismissCompletion,
      completeChase,
      activateQuest,
      getMarkerPosition,
    }}>
      {children}
      {completionModal ? (
        <CompletionModal data={completionModal} onDismiss={dismissCompletion} />
      ) : (
        <div style={{ display: 'none' }}>No completion modal</div>
      )}
    </GameContext.Provider>
  );
}

function CompletionModal({ data, onDismiss }: { data: QuestCompletionData; onDismiss: () => void }) {
  console.log('[CompletionModal] Rendering with data:', data);
  return (
    <div className="completion-overlay" onClick={onDismiss}>
      <div className="completion-modal" style={{ '--klan-color': data.klan_color } as React.CSSProperties}>
        <div className="completion-icon">🎉</div>
        <h2 className="completion-title">Quest ukończony!</h2>
        <p className="completion-quest-name">{data.quest_name}</p>
        <div className="completion-points-badge">
          <span className="completion-points-value">+{data.points}</span>
          <span className="completion-points-label">pkt dla klanu</span>
        </div>
        <p className="completion-by">Ukończony przez {data.player_name}</p>
        <p className="completion-dismiss">Kliknij by zamknąć</p>
      </div>
    </div>
  );
}

export function useGame() {
  return useContext(GameContext);
}

export function useChase(questId: string) {
  const { activeQuests, completeChase, getMarkerPosition } = useContext(GameContext);
  const [position, setPosition] = useState<MarkerPosition>(null);
  const [session, setSession] = useState<ChaseSession | null>(null);

  useEffect(() => {
    const state = activeQuests[questId];
    if (state) {
      setPosition(state.position);
      setSession(state.session);
    } else {
      setPosition(null);
      setSession(null);
    }
  }, [questId, activeQuests]);

  return {
    position,
    session,
    onCatch: (chaseId: string) => completeChase(chaseId, questId),
  };
}