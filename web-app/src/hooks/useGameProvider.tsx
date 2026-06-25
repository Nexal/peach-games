import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerSession } from '../App';
import { supabase } from '../lib/supabase';
import { generateRandomTrajectory } from '../lib/trajectory';
import type { Database } from '../types/database.types';
import '../styles/CompletionModal.css';

type ChaseSession = Database['public']['Tables']['chase_sessions']['Row'];

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

interface TaskCompletionData {
  task_id: string;
  task_name: string;
  quest_name: string;
  points: number;
  klan_name: string;
  klan_color?: string;
}

interface GameContextValue {
  playerPosition: MarkerPosition;
  activeQuests: Record<string, QuestState>;
  activeQRQuests: Record<string, { questId: string; targetLat: number; targetLng: number }>;
  completionModal: QuestCompletionData | null;
  dismissCompletion: () => void;
  completeChase: (chaseId: string, questId: string) => Promise<void>;
  activateQuest: (questId: string) => Promise<void>;
  activateQRQuest: (questId: string, targetLat: number, targetLng: number) => void;
  deactivateQRQuest: (questId: string) => void;
  deactivateChase: (questId: string) => void;
  getMarkerPosition: (questId: string) => MarkerPosition;
  klanPoints: number;
  unreadClanMessages: number;
  unreadGlobalMessages: number;
  markClanMessagesRead: () => void;
  markGlobalMessagesRead: () => void;
  setChatOpen: (open: boolean) => void;
}

interface ChaseInstance {
  session: ChaseSession;
  trajectory: { lat: number; lng: number }[] | null;
  position: MarkerPosition;
  questId: string;
  taskId: string;
}

export type { ChaseInstance };

interface QuestState {
  instances: ChaseInstance[];
}

const GameContext = createContext<GameContextValue>({
  playerPosition: null,
  activeQuests: {},
  activeQRQuests: {},
  completionModal: null,
  klanPoints: 0,
  unreadClanMessages: 0,
  unreadGlobalMessages: 0,
  dismissCompletion: () => {},
  markClanMessagesRead: () => {},
  markGlobalMessagesRead: () => {},
  setChatOpen: () => {},
  completeChase: async () => {},
  activateQuest: async () => {},
  activateQRQuest: () => {},
  deactivateQRQuest: () => {},
  deactivateChase: () => {},
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
  const [activeQRQuests, setActiveQRQuests] = useState<Record<string, { questId: string; targetLat: number; targetLng: number }>>({});
  const [completionModal, setCompletionModal] = useState<QuestCompletionData | null>(null);
  const [taskCompletionModal, setTaskCompletionModal] = useState<TaskCompletionData | null>(null);
  const [klanPoints, setKlanPoints] = useState<number>(0);
  const [unreadClanMessages, setUnreadClanMessages] = useState<number>(() => {
    const saved = localStorage.getItem('peach_unread_clan');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [unreadGlobalMessages, setUnreadGlobalMessages] = useState<number>(() => {
    const saved = localStorage.getItem('peach_unread_global');
    return saved ? parseInt(saved, 10) : 0;
  });

  const saveClanUnread = useCallback((n: number) => {
    setUnreadClanMessages(n);
    localStorage.setItem('peach_unread_clan', String(n));
  }, []);
  const saveGlobalUnread = useCallback((n: number) => {
    setUnreadGlobalMessages(n);
    localStorage.setItem('peach_unread_global', String(n));
  }, []);
  const unreadClanRef = useRef(unreadClanMessages);
  unreadClanRef.current = unreadClanMessages;
  const unreadGlobalRef = useRef(unreadGlobalMessages);
  unreadGlobalRef.current = unreadGlobalMessages;
  const chatOpenRef = useRef(false);
  const setChatOpen = useCallback((open: boolean) => { chatOpenRef.current = open; }, []);
  const chatModeRef = useRef<'klan' | 'global'>('klan');
  const lastPlayerPositionRef = useRef<MarkerPosition>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        swRegRef.current = reg;
      }).catch(() => {});
    }
  }, []);

  const showNotif = useCallback((title: string, body: string, tag: string) => {
    if (swRegRef.current && 'showNotification' in swRegRef.current) {
      swRegRef.current.showNotification(title, { body, tag, requireInteraction: true });
    } else {
      try {
        const n = new Notification(title, { body, tag, requireInteraction: true });
        n.onclick = () => window.focus();
      } catch (e) {
        console.warn('[GameProvider] Notification failed:', e);
      }
    }
  }, []);

  const markClanMessagesRead = useCallback(() => {
    saveClanUnread(0);
    chatModeRef.current = 'klan';
  }, [saveClanUnread]);
  const markGlobalMessagesRead = useCallback(() => {
    saveGlobalUnread(0);
    chatModeRef.current = 'global';
  }, [saveGlobalUnread]);

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
            getDistanceM(lastPlayerPositionRef.current.lat, lastPlayerPositionRef.current.lng, newPos.lat, newPos.lng) >= 3) {
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
          const updatedInstances = state.instances.map(inst => {
            if (!inst.trajectory || inst.trajectory.length < 2) return inst;
            if (inst.session.completed_at) return inst;

            const startedAt = new Date(inst.session.started_at!).getTime();
            const elapsedSeconds = (Date.now() - startedAt) / 1000;
            const newPos = calculatePositionFromTrajectory(inst.trajectory, elapsedSeconds, inst.session.speed_mps);

            if (newPos.lat !== inst.position?.lat || newPos.lng !== inst.position?.lng) {
              hasChanges = true;
              return { ...inst, position: newPos };
            }
            return inst;
          });
          next[questId] = { instances: updatedInstances };
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
      if (!data) { setActiveQuests({}); return; }

      const states: Record<string, QuestState> = {};
      for (const row of data as any[]) {
        const sessionTrajectory = row.trajectory
          ? (typeof row.trajectory === 'string' ? JSON.parse(row.trajectory) : row.trajectory)
          : null;
        const questTrajectory = row.quests?.trajectory
          ? (typeof row.quests.trajectory === 'string' ? JSON.parse(row.quests.trajectory) : row.quests.trajectory)
          : null;
        const trajectory = sessionTrajectory || questTrajectory;

        const startedAt = new Date(row.started_at).getTime();
        const elapsedSeconds = (Date.now() - startedAt) / 1000;
        const position = trajectory
          ? calculatePositionFromTrajectory(trajectory, elapsedSeconds, row.speed_mps)
          : null;

        const questId = row.quest_id;
        if (!states[questId]) states[questId] = { instances: [] };
        states[questId].instances.push({
          session: row as ChaseSession,
          trajectory,
          position,
          questId,
          taskId: row.task_id || row.id,
        });
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
      }, async (payload: any) => {
        const row = payload.new || payload.old;
        if (row?.klan_id !== session.klan_id) return;
        if (!row?.quest_id) return;
        const questId = row.quest_id;

        if (payload.eventType === 'INSERT' && !row.completed_at) {
          const sessionTrajectory = row.trajectory
            ? (typeof row.trajectory === 'string' ? JSON.parse(row.trajectory) : row.trajectory)
            : null;
          let trajectory = sessionTrajectory;
          if (!trajectory) {
            const { data: questData } = await supabase
              .from('quests')
              .select('trajectory')
              .eq('id', questId)
              .single();
            trajectory = questData?.trajectory
              ? (typeof questData.trajectory === 'string'
                  ? JSON.parse(questData.trajectory)
                  : questData.trajectory)
              : null;
          }

          const startedAt = new Date(row.started_at).getTime();
          const elapsedSeconds = (Date.now() - startedAt) / 1000;
          const position = trajectory
            ? calculatePositionFromTrajectory(trajectory, elapsedSeconds, row.speed_mps)
            : null;

          const instance: ChaseInstance = {
            session: row as ChaseSession,
            trajectory,
            position,
            questId,
            taskId: row.task_id || row.id,
          };

          setActiveQuests(prev => {
            const existing = prev[questId]?.instances || [];
            return { ...prev, [questId]: { instances: [...existing, instance] } };
          });
        } else if (payload.eventType === 'UPDATE' && row.completed_at) {
          setActiveQuests(prev => {
            const quest = prev[questId];
            if (!quest) return prev;
            const filtered = quest.instances.filter(i => i.session.id !== row.id);
            if (filtered.length === 0) {
              const next = { ...prev };
              delete next[questId];
              return next;
            }
            return { ...prev, [questId]: { instances: filtered } };
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

  useEffect(() => {
    if (!session?.klan_id) return;

    const channel = supabase
      .channel(`klan_${session.klan_id}_task_completions`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'task_completions',
      }, async (payload: any) => {
        if (!payload.new) return;

        const tc = payload.new as any;

        const { data: qa } = await supabase
          .from('quest_activations')
          .select('klan_id, quest_id, quests!inner(id, title)')
          .eq('id', tc.quest_activation_id)
          .single();

        if (!qa || qa.klan_id !== session.klan_id) return;

        const { data: taskData } = await supabase
          .from('tasks')
          .select('title, reward_points')
          .eq('id', tc.task_id)
          .single();

        if (!taskData) return;

        // Only show modal if the task has actually been completed
        if (!tc.completed_at) return;

        // If all tasks for this quest are completed, skip the task modal
        // — the quest completion modal will cover it
        const { count: totalTasks, error: totalErr } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('quest_id', qa.quest_id);

        const { count: completedTasks } = await supabase
          .from('task_completions')
          .select('*', { count: 'exact', head: true })
          .eq('quest_activation_id', tc.quest_activation_id)
          .not('completed_at', 'is', null);

        if (!totalErr && totalTasks != null && completedTasks != null && completedTasks >= totalTasks) {
          return;
        }

        setTaskCompletionModal({
          task_id: tc.task_id,
          task_name: taskData.title,
          quest_name: (qa as any).quests.title,
          points: taskData.reward_points || 0,
          klan_name: session?.klan_name || 'Klan',
          klan_color: session?.klan_color || '#FFD700',
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.klan_id]);

  useEffect(() => {
    if (!session?.klan_id) return;

    const fetchKlanPoints = async () => {
      const { data } = await supabase
        .from('klans').select('points').eq('id', session.klan_id).maybeSingle();
      if (data) setKlanPoints(data.points || 0);
    };

    fetchKlanPoints();

    const klanChannel = supabase
      .channel(`klan_${session.klan_id}_points`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'klans',
        filter: `id=eq.${session.klan_id}`,
      }, (payload: any) => {
        setKlanPoints(payload.new.points || 0);
      })
      .subscribe();

    return () => { supabase.removeChannel(klanChannel); };
  }, [session?.klan_id]);

  useEffect(() => {
    if (!session?.game_id) return;

    const channel = supabase
      .channel(`god_messages_${session.game_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `game_id=eq.${session.game_id}`,
      }, (payload: any) => {
        const msg = payload.new as any;
        const isGodOrSystem = !!msg.god_id || msg.sender === 'Bogowie';
        if (!isGodOrSystem || !msg.content) return;
        if (msg.klan_id && msg.klan_id !== session?.klan_id) return;
        const isClanMsg = !!msg.klan_id;
        if (!chatOpenRef.current) {
          if (isClanMsg) {
            saveClanUnread(unreadClanRef.current + 1);
          } else {
            saveGlobalUnread(unreadGlobalRef.current + 1);
          }
        } else {
          if (isClanMsg && chatModeRef.current !== 'klan') {
            saveClanUnread(unreadClanRef.current + 1);
          } else if (!isClanMsg && chatModeRef.current !== 'global') {
            saveGlobalUnread(unreadGlobalRef.current + 1);
          }
        }
        showNotif(
          '🔔 Wiadomość od Boga',
          msg.content.length > 200 ? msg.content.substring(0, 200) + '…' : msg.content,
          msg.id,
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.game_id, showNotif]);

  const completeChase = useCallback(async (chaseId: string, questId: string) => {
    if (!session?.id) return;

    setActiveQuests(prev => {
      const quest = prev[questId];
      if (!quest) return prev;
      const filtered = quest.instances.filter(i => i.session.id !== chaseId);
      if (filtered.length === 0) {
        const next = { ...prev };
        delete next[questId];
        return next;
      }
      return { ...prev, [questId]: { instances: filtered } };
    });

    const state = activeQuests[questId];
    const instance = state?.instances.find(i => i.session.id === chaseId);
    if (!instance || instance.session.completed_at) return;

    const { error } = await supabase
      .from('chase_sessions')
      .update({
        completed_at: new Date().toISOString(),
        completed_by_player_id: session.id,
      })
      .eq('id', chaseId);

    if (error) { console.error('[GameProvider] completeChase error:', error); return; }

    const { data: activations } = await supabase
      .from('quest_activations')
      .select('id')
      .eq('quest_id', questId)
      .eq('klan_id', session.klan_id)
      .is('completed_at', null)
      .is('deactivated_at', null)
      .limit(1);

    if (activations?.[0]) {
      await supabase.from('task_completions').upsert({
        quest_activation_id: activations[0].id,
        task_id: instance.taskId,
        completed_at: new Date().toISOString(),
        completed_by_player_id: session.id,
      }, { onConflict: 'quest_activation_id,task_id', ignoreDuplicates: false });
    }

    const taskPoints = instance.session.reward_points || 0;
    if (taskPoints > 0 && activations?.[0]) {
      await supabase.rpc('award_clan_points', {
        p_klan_id: session.klan_id,
        p_base_points: taskPoints,
      });
    }

    if (activations?.[0]) {
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('id, reward_points, sort_order')
        .eq('quest_id', questId)
        .order('sort_order');

      const { data: completedTasks } = await supabase
        .from('task_completions')
        .select('task_id')
        .in('task_id', (allTasks || []).map((t: any) => t.id))
        .eq('quest_activation_id', activations[0].id);

      if ((completedTasks || []).length >= (allTasks || []).length) {
        const totalPoints = (allTasks || []).reduce((sum: number, t: any) => sum + (t.reward_points || 0), 0);

        await supabase.from('quest_completions').upsert({
          quest_id: questId,
          klan_id: session.klan_id,
          game_id: session.game_id,
          completed_by_player_id: session.id,
          points_awarded: totalPoints,
        }, { onConflict: 'quest_id,klan_id', ignoreDuplicates: true });

        await supabase
          .from('quest_activations')
          .update({ completed_at: new Date().toISOString(), completed_by_player_id: session.id })
          .eq('id', activations[0].id);
      } else {
        const completedTaskIds = (completedTasks || []).map((ct: any) => ct.task_id);
        const nextTask = (allTasks || []).find((t: any) => !completedTaskIds.includes(t.id));
        if (nextTask) {
          const { data: config } = await supabase
            .from('chase_configs')
            .select('*')
            .eq('quest_id', questId)
            .maybeSingle();

          const speed = config?.speed_mps ?? 2.0;
          const catchDist = config?.catch_distance_m ?? 5;
          const wpCount = config?.waypoint_count ?? 30;
          const area = config?.area
            ? (typeof config.area === 'string' ? JSON.parse(config.area) : config.area)
            : null;

          const { data: questData } = await supabase
            .from('quests')
            .select('trajectory')
            .eq('id', questId)
            .single();

          const questTrajectory = questData?.trajectory
            ? (typeof questData.trajectory === 'string' ? JSON.parse(questData.trajectory) : questData.trajectory)
            : null;
          const firstPoint = questTrajectory?.[0];
          const baseLat = firstPoint?.lat ?? 50.090002;
          const baseLng = firstPoint?.lng ?? 19.713846;

          const taskTrajectory = generateRandomTrajectory(wpCount, area);

          await supabase.from('chase_sessions').insert({
            quest_id: questId,
            task_id: nextTask.id,
            klan_id: session.klan_id,
            game_id: session.game_id,
            started_at: new Date().toISOString(),
            start_lat: baseLat,
            start_lng: baseLng,
            speed_mps: speed,
            catch_distance_m: catchDist,
            bearing: 0,
            reward_points: nextTask.reward_points,
            trajectory: taskTrajectory,
          });
        }
      }
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

    const startedAt = data.started_at ? new Date(data.started_at).getTime() : Date.now();
    const elapsedSeconds = (Date.now() - startedAt) / 1000;
    const position = trajectory
      ? calculatePositionFromTrajectory(trajectory, elapsedSeconds, data.speed_mps)
      : null;

    setActiveQuests(prev => {
      const existing = prev[questId]?.instances || [];
      return { ...prev, [questId]: { instances: [...existing, {
        session: data,
        trajectory,
        position,
        questId,
        taskId: data.task_id || data.id,
      }] } };
    });
  }, [session, playerPosition]);

  const dismissCompletion = useCallback(() => {
    setCompletionModal(null);
  }, []);

  const dismissTaskCompletion = useCallback(() => {
    setTaskCompletionModal(null);
  }, []);

  const getMarkerPosition = useCallback((questId: string): MarkerPosition => {
    return activeQuests[questId]?.instances[0]?.position || null;
  }, [activeQuests]);

  const activateQRQuest = useCallback((questId: string, targetLat: number, targetLng: number) => {
    setActiveQRQuests(prev => ({
      ...prev,
      [questId]: { questId, targetLat, targetLng },
    }));
  }, []);

  const deactivateQRQuest = useCallback((questId: string) => {
    setActiveQRQuests(prev => {
      const next = { ...prev };
      delete next[questId];
      return next;
    });
  }, []);

  const deactivateChase = useCallback((questId: string) => {
    setActiveQuests(prev => {
      if (!prev[questId]) return prev;
      const next = { ...prev };
      delete next[questId];
      return next;
    });
  }, []);

  return (
    <GameContext.Provider value={{
      playerPosition,
      activeQuests,
      activeQRQuests,
      completionModal,
      klanPoints,
      unreadClanMessages,
      unreadGlobalMessages,
      dismissCompletion,
      markClanMessagesRead,
      markGlobalMessagesRead,
      setChatOpen,
      completeChase,
      activateQuest,
      activateQRQuest,
      deactivateQRQuest,
      deactivateChase,
      getMarkerPosition,
    }}>
      {children}
      {completionModal ? (
        <CompletionModal data={completionModal} onDismiss={dismissCompletion} />
      ) : null}
      {taskCompletionModal ? (
        <TaskCompletionModal data={taskCompletionModal} onDismiss={dismissTaskCompletion} />
      ) : null}
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
          <span className="completion-points-label">🔥 dla klanu</span>
        </div>
        <p className="completion-by">Ukończony przez {data.player_name}</p>
        <p className="completion-dismiss">Kliknij by zamknąć</p>
      </div>
    </div>
  );
}

function TaskCompletionModal({ data, onDismiss }: { data: TaskCompletionData; onDismiss: () => void }) {
  console.log('[TaskCompletionModal] Rendering with data:', data);
  return (
    <div className="completion-overlay" onClick={onDismiss}>
      <div className="completion-modal" style={{ '--klan-color': data.klan_color } as React.CSSProperties}>
        <div className="completion-icon">✅</div>
        <h2 className="completion-title">Zadanie ukończone!</h2>
        <p className="completion-quest-name">{data.quest_name}</p>
        <p style={{ color: '#fff', fontSize: '1rem', margin: '0 0 20px 0', opacity: 0.8 }}>
          {data.task_name}
        </p>
        <div className="completion-points-badge">
          <span className="completion-points-value">+{data.points}</span>
          <span className="completion-points-label">🔥 dla klanu</span>
        </div>
        <p className="completion-dismiss">Kliknij by zamknąć</p>
      </div>
    </div>
  );
}

export function useGame() {
  return useContext(GameContext);
}

export function useChase(questId: string) {
  const { activeQuests, completeChase } = useContext(GameContext);
  const [position, setPosition] = useState<MarkerPosition>(null);
  const [session, setSession] = useState<ChaseSession | null>(null);

  useEffect(() => {
    const state = activeQuests[questId];
    if (state) {
      const first = state.instances[0];
      if (first) {
        setPosition(first.position);
        setSession(first.session);
      }
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