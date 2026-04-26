import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { usePlayerSession, useGame } from '../App';
import type { Database } from '../types/database.types';
import './QuestsView.css';

type Quest = Database['public']['Tables']['quests']['Row'];

type QuestWithCompletion = Quest & {
  completed: boolean;
  completed_at?: string;
};

export function QuestsView() {
  const { session } = usePlayerSession();
  const { playerPosition, activateQuest, activeQuests } = useGame();
  const [quests, setQuests] = useState<QuestWithCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.game_id) {
      setLoading(false);
      return;
    }

    loadQuests();
  }, [session?.game_id, session?.klan_id]);

  const loadQuests = async () => {
    if (!session?.game_id || !session?.klan_id) return;

    const [questsRes, completionsRes] = await Promise.all([
      supabase.from('quests').select('*').eq('game_id', session.game_id),
      supabase
        .from('quest_completions')
        .select('*')
        .eq('klan_id', session.klan_id)
        .eq('game_id', session.game_id),
    ]);

    if (questsRes.data) {
      const completions = completionsRes.data || [];
      const questsWithStatus: QuestWithCompletion[] = questsRes.data.map((q) => {
        const completion = completions.find((c) => c.quest_id === q.id);
        return {
          ...q,
          completed: !!completion,
          completed_at: completion?.completed_at || undefined,
        };
      });
      setQuests(questsWithStatus);
    }
    setLoading(false);
  };

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
        {chaseQuests.map((quest) => (
          <ChaseQuestPanel
            key={quest.id}
            quest={quest}
            playerPosition={playerPosition}
            isActive={!!activeQuests[quest.id]}
            onActivate={() => activateQuest(quest.id)}
          />
        ))}

        {otherQuests.length === 0 && chaseQuests.length === 0 && (
          <div className="placeholder-panel glass-panel">
            <div className="placeholder-panel__icon">🗺️</div>
            <h2 className="placeholder-panel__title">Brak prób</h2>
            <p className="placeholder-panel__text">Mistrz Gry nie dodał jeszcze żadnych prób.</p>
          </div>
        )}

        {otherQuests.map((quest) => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
      </main>
    </div>
  );
}

function ChaseQuestPanel({
  quest,
  playerPosition,
  isActive,
  onActivate,
}: {
  quest: QuestWithCompletion;
  playerPosition: { lat: number; lng: number } | null;
  isActive: boolean;
  onActivate: () => void;
}) {
  return (
    <div className={`chase-quest ${isActive ? 'chase-quest--active' : ''} ${quest.completed ? 'chase-quest--completed' : ''}`}>
      <div className="chase-quest__header">
        <span className="chase-quest__icon">{quest.completed ? '✅' : '🏇'}</span>
        <div className="chase-quest__info">
          <h3 className="chase-quest__title">{quest.title}</h3>
          <p className="chase-quest__desc">{quest.description}</p>
        </div>
        <span className={`chase-quest__status ${quest.completed ? 'chase-quest__status--completed' : isActive ? 'chase-quest__status--active' : 'chase-quest__status--inactive'}`}>
          {quest.completed ? 'UKOŃCZONE!' : isActive ? 'W TRAKCIE' : 'DOSTĘPNA'}
        </span>
      </div>

      <div className="chase-quest__meta">
        <span>🏆 +{quest.reward_points} pkt</span>
        {quest.type && <span>🏇 Gonitwa</span>}
      </div>

      {isActive && (
        <div className="chase-quest__instructions">🚴 Gonitwa aktywna! Sprawdź mapę - znacznik się porusza!</div>
      )}

      {quest.completed && (
        <div className="chase-quest__success">🎉 Quest ukończony pomyślnie!</div>
      )}

      {!quest.completed && (
        <button
          className="chase-quest__btn chase-quest__btn--activate"
          onClick={onActivate}
          disabled={!playerPosition || isActive}
        >
          {!playerPosition ? 'Włącz GPS aby aktywować' : isActive ? 'Gonitwa aktywna...' : '🚀 Aktywuj gonitwę'}
        </button>
      )}
    </div>
  );
}

function QuestCard({ quest }: { quest: QuestWithCompletion }) {
  const typeIcons: Record<string, string> = {
    gps: '📍',
    qr: '📱',
    photo: '📷',
    logic: '🧩',
    chase: '🏇',
  };

  return (
    <div className={`quest-card ${quest.completed ? 'quest-card--completed' : ''}`}>
      <div className="quest-card__header">
        <span className="quest-card__icon">{typeIcons[quest.type] || '❓'}</span>
        <div className="quest-card__info">
          <h3 className="quest-card__title">{quest.title}</h3>
          <p className="quest-card__desc">{quest.description}</p>
        </div>
        {quest.completed && <span className="quest-card__badge">✓ UKOŃCZONE</span>}
      </div>

      <div className="quest-card__meta">
        <span>🏆 +{quest.reward_points} pkt</span>
        {quest.type && <span>{quest.type.toUpperCase()}</span>}
        {quest.completed && quest.completed_at && (
          <span>{new Date(quest.completed_at).toLocaleDateString('pl-PL')}</span>
        )}
      </div>
    </div>
  );
}