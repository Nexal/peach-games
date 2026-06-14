import { useState, useEffect, useCallback } from 'react';
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

function getQuestState(q: QuestWithState, klanId: string | undefined): QuestState {
  if (q.completed) return 'completed';
  if (q.klan_id && q.klan_id !== klanId) return 'unavailable';
  if (q.activated) return 'active';
  return 'available';
}

export function QuestsView() {
  const { session, gameStatus } = usePlayerSession();
  const [quests, setQuests] = useState<QuestWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrQuest, setQrQuest] = useState<QuestWithState | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [uploadTask, setUploadTask] = useState<{ taskId: string; questActivationId: string } | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

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

    const [questsRes, activationsRes, completionsRes, tasksRes, taskCompletionsRes, markersRes] = await Promise.all([
      (supabase as any).from('quests').select('*').eq('game_id', session.game_id),
      (supabase as any).from('quest_activations').select('*').eq('klan_id', session.klan_id).eq('game_id', session.game_id),
      (supabase as any).from('quest_completions').select('*').eq('klan_id', session.klan_id).eq('game_id', session.game_id),
      (supabase as any).from('tasks').select('*'),
      (supabase as any).from('task_completions').select('*'),
      (supabase as any).from('map_markers').select('id, quest_id, task_id').eq('game_id', session.game_id).eq('type', 'qr'),
    ]);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quest_activations', filter: `klan_id=eq.${session.klan_id}` }, () => {
        console.log('[QuestsView] quest_activations event received');
        loadQuests();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, () => {
        console.log('[QuestsView] task_completions event received');
        loadQuests();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quest_completions', filter: `klan_id=eq.${session.klan_id}` }, () => {
        console.log('[QuestsView] quest_completions event received');
        loadQuests();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, (payload: any) => {
        console.log('[QuestsView] submissions event received:', payload.event, payload.new, payload.old);
        const sub = payload.new || payload.old;
        if (sub?.klan_id === session.klan_id) {
          console.log('[QuestsView] Submission event for OUR klan:', sub.id, sub.status);
          loadSubmissions();
          loadQuests();
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

  const activateQuest = useCallback(async (questId: string) => {
    if (!session?.game_id || !session?.klan_id) return;

    setActivating(questId);

    const { error } = await (supabase as any).from('quest_activations').insert({
      quest_id: questId,
      klan_id: session.klan_id,
      game_id: session.game_id,
    });

    setActivating(null);

    if (error) {
      console.error('[QuestsView] activateQuest error:', error);
      return;
    }

    loadQuests();
  }, [session, loadQuests]);

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

  if (gameStatus !== 'active') {
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

  const chaseQuests = quests.filter((q) => q.type === 'chase');
  const otherQuests = quests.filter((q) => q.type !== 'chase');

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
          const state = getQuestState(quest, session.klan_id);
          return (
            <ChaseQuestCard
              key={quest.id}
              quest={quest}
              state={state}
              isActivating={activating === quest.id}
              onActivate={() => activateQuest(quest.id)}
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
          const state = getQuestState(quest, session.klan_id);
          return (
            <QuestCard
              key={quest.id}
              quest={quest}
              state={state}
              isActivating={activating === quest.id}
              onActivate={() => activateQuest(quest.id)}
              onScan={() => setQrQuest(quest)}
              onUploadPhoto={(taskId: string) => {
                if (quest.activationId) {
                  setUploadTask({ taskId, questActivationId: quest.activationId });
                }
              }}
              submissions={submissions}
            />
          );
        })}
      </main>

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

function ChaseQuestCard({
  quest,
  state,
  isActivating,
  onActivate,
}: {
  quest: QuestWithState;
  state: QuestState;
  isActivating: boolean;
  onActivate: () => void;
}) {
  const { playerPosition, activeQuests } = useGame();
  const isChaseActive = !!activeQuests[quest.id];

  return (
    <div className={`quest-card quest-card--chase ${state === 'active' ? 'quest-card--active' : ''} ${state === 'completed' ? 'quest-card--completed' : ''}`}>
      <div className="quest-card__header">
        <span className="quest-card__icon">{state === 'completed' ? '✅' : '🏇'}</span>
        <div className="quest-card__info">
          <h3 className="quest-card__title">{quest.title}</h3>
          <p className="quest-card__desc">{quest.description}</p>
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
    </div>
  );
}

function QuestCard({
  quest,
  state,
  isActivating,
  onActivate,
  onScan,
  onUploadPhoto,
  submissions,
}: {
  quest: QuestWithState;
  state: QuestState;
  isActivating: boolean;
  onActivate: () => void;
  onScan: () => void;
  onUploadPhoto: (taskId: string) => void;
  submissions: Submission[];
}) {
  const typeIcons: Record<string, string> = {
    gps: '📍',
    qr: '📱',
    photo: '📷',
    logic: '🧩',
  };

  const typeLabels: Record<string, string> = {
    gps: 'Lokacja',
    qr: 'QR Kod',
    photo: 'Fotografia',
    logic: 'Logika',
  };

  const completedTasks = quest.tasks.filter((t) => t.completed).length;
  const totalTasks = quest.tasks.length;
  const currentTask = quest.tasks[quest.currentTaskIndex];

  return (
    <div className={`quest-card ${state === 'active' ? 'quest-card--active' : ''} ${state === 'completed' ? 'quest-card--completed' : ''}`}>
      <div className="quest-card__header">
        <span className="quest-card__icon">{typeIcons[quest.type] || '❓'}</span>
        <div className="quest-card__info">
          <h3 className="quest-card__title">{quest.title}</h3>
          <p className="quest-card__desc">{quest.description}</p>
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
            <div key={task.id} className={`quest-card__task ${task.completed ? 'quest-card__task--done' : ''} ${idx === quest.currentTaskIndex ? 'quest-card__task--current' : ''}`}>
              <span className="quest-card__task-icon">
                {task.completed ? '✅' : idx < quest.currentTaskIndex ? '✅' : idx === quest.currentTaskIndex ? '🔓' : '🔒'}
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

      {state === 'active' && quest.type === 'qr' && currentTask && (
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

      {state === 'active' && quest.type !== 'qr' && quest.tasks.length === 0 && (
        <div className="quest-card__instructions">📍 Udaj się na miejsce wskazane na mapie</div>
      )}
    </div>
  );
}