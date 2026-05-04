import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { usePlayerSession, useGame } from '../App';
import { QRScannerModal } from '../components/quest/QRScannerModal';
import type { Database } from '../types/database.types';
import './QuestsView.css';

type Quest = Database['public']['Tables']['quests']['Row'];

type QuestWithState = Quest & {
  completed: boolean;
  completed_at?: string;
  activated: boolean;
  activated_at?: string;
};

type QuestState = 'unavailable' | 'available' | 'active' | 'completed';

function getQuestState(q: QuestWithState, klanId: string | undefined): QuestState {
  if (q.completed) return 'completed';
  if (q.klan_id && q.klan_id !== klanId) return 'unavailable';
  if (q.activated) return 'active';
  return 'available';
}

export function QuestsView() {
  const { session } = usePlayerSession();
  const [quests, setQuests] = useState<QuestWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrQuest, setQrQuest] = useState<QuestWithState | null>(null);
  const [qrFeedback, setQrFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.game_id || !session?.klan_id) {
      setLoading(false);
      return;
    }

    loadQuests();
  }, [session?.game_id, session?.klan_id]);

  const loadQuests = async () => {
    if (!session?.game_id || !session?.klan_id) return;

    const [questsRes, activationsRes, completionsRes] = await Promise.all([
      supabase.from('quests').select('*').eq('game_id', session.game_id),
      (supabase as any)
        .from('quest_activations')
        .select('*')
        .eq('klan_id', session.klan_id)
        .eq('game_id', session.game_id),
      supabase
        .from('quest_completions')
        .select('*')
        .eq('klan_id', session.klan_id)
        .eq('game_id', session.game_id),
    ]);

    if (questsRes.data) {
      const activations = (activationsRes.data as any[]) || [];
      const completions = (completionsRes.data as any[]) || [];

      const questsWithState: QuestWithState[] = questsRes.data.map((q) => {
        const activation = activations.find((a) => a.quest_id === q.id);
        const completion = completions.find((c) => c.quest_id === q.id);
        return {
          ...q,
          completed: !!completion,
          completed_at: completion?.completed_at || undefined,
          activated: !!activation,
          activated_at: activation?.activated_at || undefined,
        };
      });

      setQuests(questsWithState);
    }
    setLoading(false);
  };

  const activateQuest = useCallback(async (questId: string) => {
    if (!session?.game_id || !session?.klan_id) return;

    setActivating(questId);

    const { error } = await supabase.from('quest_activations').insert({
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

  const completeQRQuest = useCallback(async (questId: string, scannedCode: string) => {
    if (!session?.game_id || !session?.klan_id) return;

    const quest = quests.find((q) => q.id === questId);
    if (!quest) return;

    setQrQuest(null);

    const qrSecret = quest.qr_secret;
    if (!qrSecret || scannedCode !== qrSecret) {
      setQrFeedback({ type: 'error', text: 'Nieprawidłowy kod QR. Spróbuj ponownie.' });
      setTimeout(() => setQrFeedback(null), 3000);
      return;
    }

    const points = quest.reward_points || 0;

    const { error: completionError } = await supabase.from('quest_completions').insert({
      quest_id: questId,
      klan_id: session.klan_id,
      game_id: session.game_id,
      completed_by_player_id: session.id,
      points_awarded: points,
    });

    if (completionError) {
      setQrFeedback({ type: 'error', text: 'Błąd zapisu. Spróbuj ponownie.' });
      setTimeout(() => setQrFeedback(null), 3000);
      return;
    }

    await supabase
      .from('quest_activations')
      .update({ completed_at: new Date().toISOString(), completed_by_player_id: session.id })
      .eq('quest_id', questId)
      .eq('klan_id', session.klan_id);

    const { data: klanData } = await supabase
      .from('klans')
      .select('points')
      .eq('id', session.klan_id)
      .maybeSingle();

    if (klanData) {
      await supabase
        .from('klans')
        .update({ points: (klanData.points || 0) + points })
        .eq('id', session.klan_id);
    }

    setQrFeedback({ type: 'success', text: `Quest ukończony! +${points} 🔥` });
    loadQuests();
    setTimeout(() => setQrFeedback(null), 4000);
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
        {qrFeedback && (
          <div className={`qr-feedback qr-feedback--${qrFeedback.type}`}>
            {qrFeedback.type === 'success' ? '🎉 ' : '⚠️ '}
            {qrFeedback.text}
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
            />
          );
        })}
      </main>

      {qrQuest && (
        <QRScannerModal
          onScan={(code) => completeQRQuest(qrQuest.id, code)}
          onClose={() => setQrQuest(null)}
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
}: {
  quest: QuestWithState;
  state: QuestState;
  isActivating: boolean;
  onActivate: () => void;
  onScan: () => void;
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

  return (
    <div className={`quest-card ${state === 'active' ? 'quest-card--active' : ''} ${state === 'completed' ? 'quest-card--completed' : ''}`}>
      <div className="quest-card__header">
        <span className="quest-card__icon">{typeIcons[quest.type] || '❓'}</span>
        <div className="quest-card__info">
          <h3 className="quest-card__title">{quest.title}</h3>
          <p className="quest-card__desc">{quest.description}</p>
        </div>
        <span className={`quest-card__status ${state !== 'active' && state !== 'completed' ? 'quest-card__status--available' : ''}`}>
          {state === 'completed' ? 'UKOŃCZONE' : state === 'active' ? 'W TRAKCIE' : state === 'available' ? 'DOSTĘPNA' : 'NEDOSTĘPNA'}
        </span>
      </div>

      <div className="quest-card__meta">
        <span>🔥 +{quest.reward_points}</span>
        {quest.type && <span>{typeLabels[quest.type] || quest.type.toUpperCase()}</span>}
        {state === 'completed' && quest.completed_at && (
          <span>{new Date(quest.completed_at).toLocaleDateString('pl-PL')}</span>
        )}
      </div>

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

      {state === 'active' && quest.type === 'qr' && (
        <button className="quest-card__action-btn" onClick={onScan}>
          📱 Skanuj kod QR
        </button>
      )}

      {state === 'active' && quest.type !== 'qr' && (
        <div className="quest-card__instructions">📍 Udaj się na miejsce wskazane na mapie</div>
      )}
    </div>
  );
}