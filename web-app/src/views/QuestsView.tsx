import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { usePlayerSession, useGame } from '../App';
import { QRScannerModal } from '../components/quest/QRScannerModal';
import { MediaUploadModal } from '../components/quest/MediaUploadModal';
import { PreGameSplash } from '../components/PreGameSplash';
import { useQRScanner } from '../hooks/useQRScanner';
import type { Database } from '../types/database.types';
import './QuestsView.css';

type Quest = Database['public']['Tables']['quests']['Row'];
type Submission = Database['public']['Tables']['submissions']['Row'];

interface TaskProgress {
  id: string;
  title: string;
  description: string | null;
  type: string;
  reward_points: number;
  sort_order: number;
  totalMarkers: number;
  scannedMarkerIds: string[];
  completed: boolean;
  correctAnswer: string | null;
  markerLat: number | null;
  markerLng: number | null;
}

interface QuestWithState extends Quest {
  completed: boolean;
  completed_at?: string;
  activated: boolean;
  activated_at?: string;
  activationId: string | null;
  tasks: TaskProgress[];
  currentTaskIndex: number;
}

type QuestState = 'unavailable' | 'available' | 'active' | 'completed';

function getQuestState(q: QuestWithState, klanId: string | undefined, activeChapterIds?: Set<string>): QuestState {
  if (q.completed) return 'completed';
  if (q.klan_id && q.klan_id !== klanId) return 'unavailable';
  if (q.requires_chapter_id && activeChapterIds && !activeChapterIds.has(q.requires_chapter_id)) return 'unavailable';
  if (q.activated) return 'active';
  return 'available';
}

export function QuestsView() {
  const { session, gameStatus, navigateTo, setMapFocus } = usePlayerSession();
  const [quests, setQuests] = useState<QuestWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrQuest, setQrQuest] = useState<QuestWithState | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [uploadTask, setUploadTask] = useState<{ taskId: string; questActivationId: string } | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [textFeedback, setTextFeedback] = useState<{ taskId: string; type: 'success' | 'error'; text: string } | null>(null);
  const [expandedQuest, setExpandedQuest] = useState<QuestWithState | null>(null);
  const [activeChapterIds, setActiveChapterIds] = useState<Set<string>>(new Set());

  const loadSubmissions = useCallback(async () => {
    if (!session?.game_id || !session?.klan_id) return;
    const { data } = await (supabase as any)
      .from('submissions')
      .select('*')
      .eq('klan_id', session.klan_id)
      .order('submitted_at', { ascending: false });
    if (data) setSubmissions(data);
  }, [session?.game_id, session?.klan_id]);

  const loadQuests = useCallback(async () => {
    if (!session?.game_id || !session?.klan_id) return;

    const [questsRes, activationsRes, completionsRes, tasksRes, taskCompletionsRes, markersRes, chaptersRes] = await Promise.all([
      (supabase as any).from('quests').select('*').eq('game_id', session.game_id),
      (supabase as any).from('quest_activations').select('*').eq('klan_id', session.klan_id).eq('game_id', session.game_id).is('deactivated_at', null),
      (supabase as any).from('quest_completions').select('*').eq('klan_id', session.klan_id).eq('game_id', session.game_id),
      (supabase as any).from('tasks').select('*'),
      (supabase as any).from('task_completions').select('*'),
      (supabase as any).from('map_markers').select('id, quest_id, task_id, lat, lng').eq('game_id', session.game_id).in('type', ['qr', 'photo', 'chase']),
      (supabase as any).from('klan_chapter_progress').select('chapter_id').eq('klan_id', session.klan_id).eq('game_id', session.game_id).eq('is_active', true),
    ]);

    const chapterIds = new Set<string>((chaptersRes.data || []).map((c: any) => c.chapter_id));
    setActiveChapterIds(chapterIds);

    if (questsRes.data) {
      const activations = (activationsRes.data as any[]) || [];
      const completions = (completionsRes.data as any[]) || [];
      const allTasks = (tasksRes.data as any[]) || [];
      const allTaskCompletions = (taskCompletionsRes.data as any[]) || [];
      const allMarkers = (markersRes.data as any[]) || [];

      const questsWithState: QuestWithState[] = (questsRes.data as any[]).map((q: any) => {
        const activation = activations.find((a: any) => a.quest_id === q.id && !a.completed_at);
        const completion = completions.find((c: any) => c.quest_id === q.id);

        const questTasks = allTasks
          .filter((t: any) => t.quest_id === q.id)
          .sort((a: any, b: any) => a.sort_order - b.sort_order);

        let tasks: TaskProgress[] = [];
        let currentTaskIndex = 0;
        let foundIncomplete = false;

        questTasks.forEach((task: any, idx: number) => {
          const taskMarkers = allMarkers.filter((m: any) => m.task_id === task.id);
          const totalMarkers = taskMarkers.length;

          let scannedMarkerIds: string[] = [];
          let taskCompleted = false;

          const taskCompletion = allTaskCompletions.find(
            (tc: any) => tc.task_id === task.id && tc.quest_activation_id === activation?.id
          );

          if (taskCompletion?.completed_at) {
            taskCompleted = true;
          } else if (taskCompletion?.metadata?.scanned_marker_ids) {
            scannedMarkerIds = taskCompletion.metadata.scanned_marker_ids;
          }

          if (!taskCompleted && !foundIncomplete) {
            currentTaskIndex = idx;
            foundIncomplete = true;
          }

          const firstMarker = taskMarkers[0] as any;
          tasks.push({
            id: task.id,
            title: task.title,
            description: task.description,
            type: task.type,
            reward_points: task.reward_points || 0,
            sort_order: task.sort_order,
            totalMarkers,
            scannedMarkerIds,
            completed: taskCompleted,
            correctAnswer: task.correct_answer || null,
            markerLat: firstMarker?.lat ?? null,
            markerLng: firstMarker?.lng ?? null,
          });
        });

        return {
          ...q,
          completed: !!completion,
          completed_at: completion?.completed_at || undefined,
          activated: !!activation && !completion,
          activated_at: activation?.activated_at || undefined,
          activationId: activation?.id || null,
          tasks,
          currentTaskIndex,
        };
      });

      setQuests(questsWithState);
    }
    setLoading(false);
  }, [session?.game_id, session?.klan_id]);

  const loadQuestsRef = useRef(loadQuests);
  loadQuestsRef.current = loadQuests;
  const loadSubmissionsRef = useRef(loadSubmissions);
  loadSubmissionsRef.current = loadSubmissions;

  useEffect(() => {
    if (!session?.game_id || !session?.klan_id) {
      setLoading(false);
      return;
    }
    loadQuests();
    loadSubmissions();
  }, [session?.game_id, session?.klan_id]);

  useEffect(() => {
    if (!session?.game_id || !session?.klan_id) return;

    console.log('[QuestsView] Setting up realtime subscription for klan:', session.klan_id);

    const channel = supabase
      .channel('quests_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quest_activations', filter: `game_id=eq.${session.game_id}` }, (payload: any) => {
        const relevant = (payload.old?.klan_id === session.klan_id || payload.new?.klan_id === session.klan_id);
        if (relevant) {
          console.log('[QuestsView] quest_activations event received for our klan');
          loadQuestsRef.current();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, () => {
        console.log('[QuestsView] task_completions event received');
        loadQuestsRef.current();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quest_completions', filter: `game_id=eq.${session.game_id}` }, (payload: any) => {
        if (payload.old?.klan_id === session.klan_id || payload.new?.klan_id === session.klan_id) {
          console.log('[QuestsView] quest_completions event received for our klan');
          loadQuestsRef.current();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'klan_chapter_progress', filter: `game_id=eq.${session.game_id}` }, (payload: any) => {
        if (payload.old?.klan_id === session.klan_id || payload.new?.klan_id === session.klan_id) {
          console.log('[QuestsView] chapter progress event for our klan');
          loadQuestsRef.current();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, (payload: any) => {
        console.log('[QuestsView] submissions event received:', payload.event, payload.new, payload.old);
        const sub = payload.new || payload.old;
        if (sub?.klan_id === session.klan_id) {
          console.log('[QuestsView] Submission event for OUR klan:', sub.id, sub.status);
           loadSubmissionsRef.current();
           loadQuestsRef.current();
        } else {
          console.log('[QuestsView] Submission event for DIFFERENT klan:', sub?.klan_id, 'our klan:', session.klan_id);
        }
      })
      .subscribe((status) => {
        console.log('[QuestsView] Realtime status:', status);
      });

    return () => {
      console.log('[QuestsView] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [session?.game_id, session?.klan_id, loadSubmissions, loadQuests]);

  const { scan, feedback } = useQRScanner(loadQuests);

  const activateQuest = useCallback(async (quest: QuestWithState) => {
    const questId = quest.id;
    if (!session?.game_id || !session?.klan_id) return;

    setActivating(questId);

    const { error } = await (supabase as any)
      .from('quest_activations')
      .upsert({
        quest_id: questId,
        klan_id: session.klan_id,
        game_id: session.game_id,
        activated_at: new Date().toISOString(),
        completed_at: null,
        deactivated_at: null,
        completed_by_player_id: null,
      }, { onConflict: 'quest_id,klan_id' });

    setActivating(null);

    if (error) {
      console.error('[QuestsView] activateQuest error:', error);
      return;
    }

    if (quest.type === 'chase') {
      const { data: config } = await (supabase as any)
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

      const questTrajectory = quest.trajectory
        ? (typeof quest.trajectory === 'string' ? JSON.parse(quest.trajectory) : quest.trajectory)
        : null;
      const firstPoint = questTrajectory?.[0];
      const baseLat = firstPoint?.lat ?? 50.090002;
      const baseLng = firstPoint?.lng ?? 19.713846;

      await (supabase as any).from('chase_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('quest_id', questId)
        .eq('klan_id', session.klan_id)
        .is('completed_at', null);

      for (const task of quest.tasks) {
        const taskTrajectory = generateRandomTrajectory(wpCount, area);

        await (supabase as any).from('chase_sessions').insert({
          quest_id: questId,
          task_id: task.id,
          klan_id: session.klan_id,
          game_id: session.game_id,
          started_at: new Date().toISOString(),
          start_lat: baseLat,
          start_lng: baseLng,
          speed_mps: speed,
          catch_distance_m: catchDist,
          bearing: 0,
          reward_points: task.reward_points,
          trajectory: taskTrajectory,
        });
      }
    }

    loadQuests();
  }, [session, loadQuests]);

  const generateRandomTrajectory = useCallback((waypointCount: number, area: any) => {
    let randomPoint: () => { lat: number; lng: number };

    if (area && Array.isArray(area) && area.length === 4 && Array.isArray(area[0])) {
      // Polygon (4 corners)
      const corners = area.map((p: number[]) => ({ lat: p[0], lng: p[1] }));
      randomPoint = () => {
        const u = Math.random();
        const v = Math.random();
        return {
          lat: Math.round(((1-u)*(1-v)*corners[0].lat + u*(1-v)*corners[1].lat + u*v*corners[2].lat + (1-u)*v*corners[3].lat) * 1e6) / 1e6,
          lng: Math.round(((1-u)*(1-v)*corners[0].lng + u*(1-v)*corners[1].lng + u*v*corners[2].lng + (1-u)*v*corners[3].lng) * 1e6) / 1e6,
        };
      };
    } else if (area && typeof area.center !== 'undefined') {
      // Circle: { center: [lat, lng], radius: number }
      const cLat = area.center[0];
      const cLng = area.center[1];
      const radius = area.radius || 20;
      const latPerM = 1 / 111320;
      const lngPerM = 1 / (111320 * Math.cos(cLat * Math.PI / 180));
      randomPoint = () => {
        const angle = Math.random() * 2 * Math.PI;
        const dist = radius * Math.random();
        return {
          lat: Math.round((cLat + dist * latPerM * Math.cos(angle)) * 1e6) / 1e6,
          lng: Math.round((cLng + dist * lngPerM * Math.sin(angle)) * 1e6) / 1e6,
        };
      };
    } else {
      // Default quadrilateral
      const corners = [
        { lat: 50.089915, lng: 19.714189 },
        { lat: 50.089368, lng: 19.714428 },
        { lat: 50.089570, lng: 19.716539 },
        { lat: 50.090104, lng: 19.716177 },
      ];
      randomPoint = () => {
        const u = Math.random();
        const v = Math.random();
        return {
          lat: Math.round(((1-u)*(1-v)*corners[0].lat + u*(1-v)*corners[1].lat + u*v*corners[2].lat + (1-u)*v*corners[3].lat) * 1e6) / 1e6,
          lng: Math.round(((1-u)*(1-v)*corners[0].lng + u*(1-v)*corners[1].lng + u*v*corners[2].lng + (1-u)*v*corners[3].lng) * 1e6) / 1e6,
        };
      };
    }
    return Array.from({ length: waypointCount }, () => randomPoint());
  }, []);

  const deactivateQuest = useCallback(async (questId: string, isChase?: boolean) => {
    if (!session?.game_id || !session?.klan_id) return;

    const { error } = await (supabase as any)
      .from('quest_activations')
      .update({ deactivated_at: new Date().toISOString() })
      .eq('quest_id', questId)
      .eq('klan_id', session.klan_id)
      .is('completed_at', null)
      .is('deactivated_at', null);

    if (error) {
      console.error('[QuestsView] deactivateQuest error:', error);
      return;
    }

    if (isChase) {
      await (supabase as any).from('chase_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('quest_id', questId)
        .eq('klan_id', session.klan_id)
        .is('completed_at', null);
    }

    loadQuests();
    setExpandedQuest(null);
  }, [session, loadQuests]);

  const submitTextAnswer = useCallback(async (taskId: string, answer: string) => {
    if (!session?.game_id || !session?.klan_id || !session?.id) return;

    const quest = quests.find(q => q.tasks.some(t => t.id === taskId));
    const task = quest?.tasks.find(t => t.id === taskId);

    if (!task?.correctAnswer) {
      setTextFeedback({ taskId, type: 'error', text: 'Brak poprawnej odpowiedzi dla tego zadania.' });
      return;
    }

    if (answer.trim().toLowerCase() !== task.correctAnswer.trim().toLowerCase()) {
      setTextFeedback({ taskId, type: 'error', text: '❌ Niepoprawna odpowiedź. Spróbuj ponownie.' });
      setTimeout(() => setTextFeedback(null), 3000);
      return;
    }

    const { data: activation } = await (supabase as any)
      .from('quest_activations')
      .select('id')
      .eq('quest_id', quest!.id)
      .eq('klan_id', session.klan_id)
      .is('completed_at', null)
      .is('deactivated_at', null)
      .limit(1);

    if (!activation || activation.length === 0) return;

    const activationId = activation[0].id;

    await (supabase as any).from('task_completions').upsert(
      {
        quest_activation_id: activationId,
        task_id: taskId,
        completed_at: new Date().toISOString(),
        completed_by_player_id: session.id,
        metadata: { answer_text: answer },
      },
      { onConflict: 'quest_activation_id, task_id' },
    );

    const taskPoints = task.reward_points || 0;

    if (taskPoints > 0) {
      const { data: klanData } = await (supabase as any)
        .from('klans')
        .select('points')
        .eq('id', session.klan_id)
        .maybeSingle();

      if (klanData) {
        await (supabase as any)
          .from('klans')
          .update({ points: (klanData.points || 0) + taskPoints })
          .eq('id', session.klan_id);
      }
    }

    // Broadcast notification
    const { data: questData } = await (supabase as any)
      .from('quests')
      .select('title')
      .eq('id', quest!.id)
      .single();
    const { data: klanInfo } = await (supabase as any)
      .from('klans')
      .select('name')
      .eq('id', session.klan_id)
      .single();
    const questTitle = questData?.title || 'Nieznany quest';
    const klanName = klanInfo?.name || 'Klan';
    const taskTitle = task.title || 'Nieznane zadanie';

    const allTasksDone = quest!.tasks.every(t => t.completed || t.id === taskId);
    const totalPoints = quest!.tasks.reduce((sum, t) => sum + (t.reward_points || 0), 0);

    if (allTasksDone) {
      await (supabase as any).from('quest_completions').insert({
        quest_id: quest!.id,
        klan_id: session.klan_id,
        game_id: session.game_id,
        completed_by_player_id: session.id,
        points_awarded: totalPoints,
      });

      await (supabase as any)
        .from('quest_activations')
        .update({ completed_at: new Date().toISOString(), completed_by_player_id: session.id })
        .eq('id', activationId);

      await (supabase as any).from('messages').insert({
        content: `${klanName} ukończył quest „${questTitle}" (+${totalPoints} 🔥)!`,
        sender: 'Bogowie',
        player_id: null,
        game_id: session.game_id,
        god_id: null,
        klan_id: null,
        sender_klan_id: session.klan_id,
        tts_requested: false,
      });
    } else {
      await (supabase as any).from('messages').insert({
        content: `${klanName} ukończył zadanie „${taskTitle}" w queście „${questTitle}" (+${taskPoints} 🔥)!`,
        sender: 'Bogowie',
        player_id: null,
        game_id: session.game_id,
        god_id: null,
        klan_id: null,
        sender_klan_id: session.klan_id,
        tts_requested: false,
      });
    }

    setTextFeedback({ taskId, type: 'success', text: allTasksDone ? `✅ Quest ukończony! +${totalPoints} 🔥` : '✅ Poprawna odpowiedź!' });
    setTimeout(() => setTextFeedback(null), 3000);
    loadQuests();
  }, [session, quests, loadQuests]);

  if (!session) {
    return (
      <div className="view view--quests">
        <header className="view__header">
          <h1 className="view__title view__title--small">🗺️ Próby</h1>
        </header>
        <main className="view__content">
          <div className="placeholder-panel glass-panel">
            <div className="placeholder-panel__icon">🔒</div>
            <h2 className="placeholder-panel__title">Brak sesji</h2>
            <p className="placeholder-panel__text">Dołącz do gry, aby zobaczyć próby.</p>
          </div>
        </main>
      </div>
    );
  }

  if (gameStatus !== 'active' && !session?.is_test) {
    return (
      <div className="view view--quests">
        <header className="view__header">
          <h1 className="view__title view__title--small">🗺️ Próby</h1>
          <p className="view__subtitle">Zadania dla Twojego Klanu</p>
        </header>
        <main className="view__content">
          <PreGameSplash view="quests" status={gameStatus} />
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="view view--quests">
        <header className="view__header">
          <h1 className="view__title view__title--small">🗺️ Próby</h1>
        </header>
        <main className="view__content">
          <div className="quests-loading">Ładowanie prób...</div>
        </main>
      </div>
    );
  }

  const visibleQuests = quests.filter(q => {
    if (q.requires_chapter_id && activeChapterIds && !activeChapterIds.has(q.requires_chapter_id)) return false;
    return true;
  });
  const chaseQuests = visibleQuests.filter((q) => q.type === 'chase');
  const otherQuests = visibleQuests.filter((q) => q.type !== 'chase');

  return (
    <div className="view view--quests">
      <header className="view__header">
        <h1 className="view__title view__title--small">🗺️ Próby</h1>
        <p className="view__subtitle">Zadania dla Twojego Klanu</p>
      </header>

      <main className="view__content">
        {feedback && (
          <div className={`qr-feedback qr-feedback--${feedback.type}`}>
            {feedback.text}
          </div>
        )}

        {chaseQuests.map((quest) => {
          const state = getQuestState(quest, session.klan_id, activeChapterIds);
          return (
            <ChaseQuestCard
              key={quest.id}
              quest={quest}
              state={state}
              isActivating={activating === quest.id}
              onActivate={() => activateQuest(quest)}
              onDeactivate={() => deactivateQuest(quest.id, true)}
              onNavigateToMap={(lat, lng) => { setMapFocus([lat, lng]); navigateTo('map'); }}
              onExpand={() => setExpandedQuest(quest)}
            />
          );
        })}

        {otherQuests.length === 0 && chaseQuests.length === 0 && (
          <div className="placeholder-panel glass-panel">
            <div className="placeholder-panel__icon">🗺️</div>
            <h2 className="placeholder-panel__title">Brak prób</h2>
            <p className="placeholder-panel__text">Mistrz Gry nie dodał jeszcze żadnych prób.</p>
          </div>
        )}

        {otherQuests.map((quest) => {
          const state = getQuestState(quest, session.klan_id, activeChapterIds);
          return (
            <QuestCard
              key={quest.id}
              quest={quest}
              state={state}
              isActivating={activating === quest.id}
              onActivate={() => activateQuest(quest)}
              onDeactivate={() => deactivateQuest(quest.id, quest.type === 'chase')}
              onNavigateToMap={(lat, lng) => { setMapFocus([lat, lng]); navigateTo('map'); }}
              onScan={() => setQrQuest(quest)}
              onUploadPhoto={(taskId: string) => {
                if (quest.activationId) {
                  setUploadTask({ taskId, questActivationId: quest.activationId });
                }
              }}
              onSubmitText={(taskId, answer) => submitTextAnswer(taskId, answer)}
              textFeedback={textFeedback}
              submissions={submissions}
              onExpand={() => setExpandedQuest(quest)}
            />
          );
        })}
      </main>

      {expandedQuest && (
        <QuestDetailModal
          quest={expandedQuest}
          state={getQuestState(expandedQuest, session.klan_id, activeChapterIds)}
          submissions={submissions}
          onClose={() => setExpandedQuest(null)}
          onDeactivate={() => deactivateQuest(expandedQuest.id, expandedQuest.type === 'chase')}
        />
      )}

      {qrQuest && (
        <QRScannerModal
          onScan={(code) => {
            const questId = qrQuest.id;
            setQrQuest(null);
            scan(questId, code);
          }}
          onClose={() => setQrQuest(null)}
        />
      )}

      {uploadTask && session?.klan_id && (
        <MediaUploadModal
          taskId={uploadTask.taskId}
          questActivationId={uploadTask.questActivationId}
          klanId={session.klan_id}
          gameId={session.game_id}
          onClose={() => setUploadTask(null)}
          onSubmit={() => {
            setUploadTask(null);
            loadSubmissions();
          }}
        />
      )}
    </div>
  );
}

function truncateDescription(desc: string | null, maxSentences = 2): string {
  if (!desc) return '';
  const sentences = desc.split(/(?<=[.!?])\s+/);
  if (sentences.length <= maxSentences) return desc;
  return sentences.slice(0, maxSentences).join(' ') + '…';
}

function ChaseQuestCard({
  quest,
  state,
  isActivating,
  onActivate,
  onDeactivate,
  onNavigateToMap,
  onExpand,
}: {
  quest: QuestWithState;
  state: QuestState;
  isActivating: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onNavigateToMap: (lat: number, lng: number) => void;
  onExpand: () => void;
}) {
  const { playerPosition, activeQuests } = useGame();
  const isChaseActive = (activeQuests[quest.id]?.instances?.length || 0) > 0;
  const shortDesc = truncateDescription(quest.description);
  const firstTask = quest.tasks[0];

  return (
    <div className={`quest-card quest-card--chase ${state === 'active' ? 'quest-card--active' : ''} ${state === 'completed' ? 'quest-card--completed' : ''}`}>
      <div className="quest-card__header">
        <span className="quest-card__icon">
          {quest.icon_url ? (
            <img src={quest.icon_url} alt="" className="quest-card__icon-img" />
          ) : (
            state === 'completed' ? '✅' : '🏇'
          )}
        </span>
        <div className="quest-card__info">
          <h3 className="quest-card__title">{quest.title}</h3>
          <p className="quest-card__desc">{shortDesc}</p>
          {(quest.description && quest.description !== shortDesc) && (
            <button className="quest-card__expand-btn" onClick={(e) => { e.stopPropagation(); onExpand(); }}>
              czytaj więcej…
            </button>
          )}
        </div>
        <span className="quest-card__status">
          {state === 'completed' ? 'UKOŃCZONE' : state === 'active' ? 'W TRAKCIE' : state === 'available' ? 'DOSTĘPNA' : 'NIEDOSTĘPNA'}
        </span>
      </div>

      <div className="quest-card__meta">
        <span>🔥 +{quest.reward_points}</span>
        <span>🏇 Gonitwa</span>
      </div>

      {state === 'active' && isChaseActive && (
        <div className="quest-card__instructions">🚴 Gonitwa aktywna! Sprawdź mapę - znacznik się porusza!</div>
      )}

      {state === 'completed' && (
        <div className="quest-card__success">🎉 Quest ukończony pomyślnie!</div>
      )}

      {state === 'available' && (
        <button
          className="quest-card__action-btn"
          onClick={onActivate}
          disabled={!playerPosition || isActivating}
        >
          {!playerPosition ? '📍 Włącz GPS aby aktywować' : isActivating ? '⏳ Aktywowanie...' : '🚀 Aktywuj gonitwę'}
        </button>
      )}

      {state === 'active' && (
        <div className="quest-card__secondary-actions">
          {firstTask?.markerLat != null && firstTask?.markerLng != null && (
            <button
              className="quest-card__secondary-btn"
              onClick={() => onNavigateToMap(firstTask.markerLat!, firstTask.markerLng!)}
            >
              🗺️ Pokaż na mapie
            </button>
          )}
          <button
            className="quest-card__secondary-btn quest-card__secondary-btn--danger"
            onClick={onDeactivate}
          >
            ❌ Zatrzymaj gonitwę
          </button>
        </div>
      )}
    </div>
  );
}

function QuestCard({
  quest,
  state,
  isActivating,
  onActivate,
  onDeactivate,
  onNavigateToMap,
  onScan,
  onUploadPhoto,
  onSubmitText,
  textFeedback,
  submissions,
  onExpand,
}: {
  quest: QuestWithState;
  state: QuestState;
  isActivating: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onNavigateToMap: (lat: number, lng: number) => void;
  onScan: () => void;
  onUploadPhoto: (taskId: string) => void;
  onSubmitText: (taskId: string, answer: string) => void;
  textFeedback: { taskId: string; type: 'success' | 'error'; text: string } | null;
  submissions: Submission[];
  onExpand: () => void;
}) {
  const typeIcons: Record<string, string> = {
    gps: '📍',
    qr: '📱',
    photo: '📷',
    logic: '🧩',
    text: '✍️',
  };

  const typeLabels: Record<string, string> = {
    gps: 'Lokacja',
    qr: 'QR Kod',
    photo: 'Fotografia',
    logic: 'Logika',
    text: 'Tekst',
  };

  const [textAnswer, setTextAnswer] = useState('');
  const shortDesc = truncateDescription(quest.description);

  const completedTasks = quest.tasks.filter((t) => t.completed).length;
  const totalTasks = quest.tasks.length;
  const currentTask = quest.tasks[quest.currentTaskIndex];

  return (
    <div className={`quest-card ${state === 'active' ? 'quest-card--active' : ''} ${state === 'completed' ? 'quest-card--completed' : ''}`}>
      <div className="quest-card__header">
        <span className="quest-card__icon">
          {quest.icon_url ? (
            <img src={quest.icon_url} alt="" className="quest-card__icon-img" />
          ) : (
            typeIcons[quest.type] || '❓'
          )}
        </span>
        <div className="quest-card__info">
          <h3 className="quest-card__title">{quest.title}</h3>
          <p className="quest-card__desc">{shortDesc}</p>
          {(quest.description && quest.description !== shortDesc) && (
            <button className="quest-card__expand-btn" onClick={(e) => { e.stopPropagation(); onExpand(); }}>
              czytaj więcej…
            </button>
          )}
        </div>
        <span className={`quest-card__status ${state !== 'active' && state !== 'completed' ? 'quest-card__status--available' : ''}`}>
          {state === 'completed' ? 'UKOŃCZONE' : state === 'active' ? 'W TRAKCIE' : state === 'available' ? 'DOSTĘPNY' : 'NIEDOSTĘPNY'}
        </span>
      </div>

      <div className="quest-card__meta">
        <span>🔥 +{quest.reward_points}</span>
        {quest.type && <span>{typeLabels[quest.type] || quest.type.toUpperCase()}</span>}
        {state === 'active' && totalTasks > 0 && (
          <span>📋 {completedTasks}/{totalTasks} zadań</span>
        )}
        {state === 'completed' && quest.completed_at && (
          <span>{new Date(quest.completed_at).toLocaleDateString('pl-PL')}</span>
        )}
      </div>

      {state === 'active' && quest.tasks.length > 0 && (
        <div className="quest-card__tasks">
          {quest.tasks.map((task, idx) => (
            <div key={task.id} className={`quest-card__task ${task.completed ? 'quest-card__task--done' : ''} ${!task.completed && (quest.type === 'chase' || idx === quest.currentTaskIndex) ? 'quest-card__task--current' : ''}`}>
              <span className="quest-card__task-icon">
                {task.completed ? '✅' : idx < quest.currentTaskIndex ? '✅' : (quest.type === 'chase' || idx === quest.currentTaskIndex) ? '🔓' : '🔒'}
              </span>
              <span className="quest-card__task-title">{task.title}</span>
              <span className="quest-card__task-reward">+{task.reward_points}🔥</span>
              {idx === quest.currentTaskIndex && task.type === 'qr' && (
                <div className="quest-card__task-progress">
                  <div className="quest-card__progress-bar">
                    <div
                      className="quest-card__progress-fill"
                      style={{ width: `${(task.scannedMarkerIds.length / Math.max(task.totalMarkers, 1)) * 100}%` }}
                    />
                  </div>
                  <span className="quest-card__progress-label">
                    {task.scannedMarkerIds.length}/{task.totalMarkers} kodów
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {state === 'completed' && (
        <div className="quest-card__success">🎉 Quest ukończony pomyślnie!</div>
      )}

      {state === 'available' && (
        <button
          className="quest-card__action-btn"
          onClick={onActivate}
          disabled={isActivating}
        >
          {isActivating ? '⏳ Aktywowanie...' : '🚀 Aktywuj'}
        </button>
      )}

      {state === 'active' && currentTask && currentTask.type === 'qr' && (
        <button className="quest-card__action-btn" onClick={onScan}>
          📱 Skanuj kod QR ({currentTask.scannedMarkerIds.length}/{currentTask.totalMarkers})
        </button>
      )}

      {state === 'active' && currentTask && !currentTask.completed && currentTask.type === 'photo' && (() => {
        const taskSubmission = submissions.find(s => s.task_id === currentTask.id && s.status === 'pending');
        const rejectedSubmission = submissions.find(s => s.task_id === currentTask.id && s.status === 'rejected');
        if (taskSubmission) {
          return (
            <div className="quest-card__submission-status quest-card__submission-status--pending">
              ⏳ Oczekuje na weryfikację przez Boga
            </div>
          );
        }
        if (rejectedSubmission) {
          return (
            <div className="quest-card__submission-status quest-card__submission-status--rejected">
              ❌ Odrzucone: {rejectedSubmission.admin_comment || 'Brak komentarza'}
              <button className="quest-card__action-btn quest-card__action-btn--retry" onClick={() => onUploadPhoto(currentTask.id)}>
                🔄 Wyślij ponownie
              </button>
            </div>
          );
        }
        return (
          <button className="quest-card__action-btn" onClick={() => onUploadPhoto(currentTask.id)}>
            📷 Wyślij dowód (zdjęcie lub wideo)
          </button>
        );
      })()}

      {state === 'active' && currentTask && !currentTask.completed && currentTask.type === 'text' && (
        <div className="quest-card__text-input">
          {textFeedback?.taskId === currentTask.id && (
            <div className={`quest-card__submission-status quest-card__submission-status--${textFeedback.type === 'error' ? 'rejected' : 'pending'}`}>
              {textFeedback.text}
            </div>
          )}
          <textarea
            className="quest-card__textarea"
            placeholder="Wpisz odpowiedź..."
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            rows={3}
          />
          <button
            className="quest-card__action-btn"
            onClick={() => { onSubmitText(currentTask.id, textAnswer); setTextAnswer(''); }}
            disabled={!textAnswer.trim()}
          >
            ✍️ Wyślij odpowiedź
          </button>
        </div>
      )}

      {state === 'active' && quest.type !== 'qr' && quest.tasks.length === 0 && (
        <div className="quest-card__instructions">📍 Udaj się na miejsce wskazane na mapie</div>
      )}

      {state === 'active' && (
        <div className="quest-card__secondary-actions">
          {currentTask?.markerLat != null && currentTask?.markerLng != null && (
            <button
              className="quest-card__secondary-btn"
              onClick={() => onNavigateToMap(currentTask.markerLat!, currentTask.markerLng!)}
            >
              🗺️ Pokaż na mapie
            </button>
          )}
          <button
            className="quest-card__secondary-btn quest-card__secondary-btn--danger"
            onClick={onDeactivate}
          >
            ❌ Dezaktywuj quest
          </button>
        </div>
      )}
    </div>
  );
}

function QuestDetailModal({
  quest,
  state,
  submissions,
  onClose,
  onDeactivate,
}: {
  quest: QuestWithState;
  state: QuestState;
  submissions: Submission[];
  onClose: () => void;
  onDeactivate: () => void;
}) {
  const typeLabels: Record<string, string> = {
    gps: 'Lokacja GPS',
    qr: 'Kod QR',
    photo: 'Dowód foto',
    logic: 'Logika',
    chase: 'Gonitwa',
  };

  return (
    <div className="quest-detail-overlay" onClick={onClose}>
      <div className="quest-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="quest-detail-modal__close" onClick={onClose}>✕</button>
        
        <h2 className="quest-detail-modal__title">{quest.title}</h2>
        
        <div className="quest-detail-modal__meta">
          <span className={`quest-detail-modal__status quest-detail-modal__status--${state}`}>
            {state === 'completed' ? '✅ UKOŃCZONY' : state === 'active' ? '⚡ W TRAKCIE' : state === 'available' ? '📋 DOSTĘPNY' : '🔒 NIEDOSTĘPNY'}
          </span>
          <span>🔥 {quest.reward_points} pkt</span>
          <span>{typeLabels[quest.type] || quest.type}</span>
        </div>

        <p className="quest-detail-modal__desc">{quest.description}</p>

        {quest.tasks.length > 0 && (
          <div className="quest-detail-modal__tasks">
            <h3 className="quest-detail-modal__tasks-title">
              Zadania ({quest.tasks.filter(t => t.completed).length}/{quest.tasks.length})
            </h3>
            {quest.tasks.map((task, idx) => {
              const taskSub = submissions.find(s => s.task_id === task.id);
              return (
                <div key={task.id} className={`quest-detail-modal__task ${task.completed ? 'quest-detail-modal__task--done' : ''}`}>
                  <span className="quest-detail-modal__task-icon">
                    {task.completed ? '✅' : idx === quest.currentTaskIndex && state === 'active' ? '🔓' : '🔒'}
                  </span>
                  <div className="quest-detail-modal__task-info">
                    <span className="quest-detail-modal__task-title">{task.title}</span>
                    {task.description && (
                      <span className="quest-detail-modal__task-desc">{task.description}</span>
                    )}
                  </div>
                  <span className="quest-detail-modal__task-points">+{task.reward_points}🔥</span>
                  {taskSub && (
                    <span className={`quest-detail-modal__task-sub quest-detail-modal__task-sub--${taskSub.status}`}>
                      {taskSub.status === 'pending' ? '⏳' : taskSub.status === 'approved' ? '✅' : '❌'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {state === 'active' && (
          <button className="quest-detail-modal__deactivate" onClick={onDeactivate}>
            ❌ Dezaktywuj quest
          </button>
        )}

        <button className="quest-detail-modal__done" onClick={onClose}>
          Zamknij
        </button>
      </div>
    </div>
  );
}