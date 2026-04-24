import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { usePlayerSession } from '../App';
import { usePlayerPosition } from '../hooks/usePlayerPosition';
import { useChaseQuest } from '../components/quest/ChaseQuest';
import type { Database } from '../types/database.types';
import './QuestsView.css';

type Quest = Database['public']['Tables']['quests']['Row'];

type QuestWithCompletion = Quest & {
  completed: boolean;
  completed_at?: string;
};

export function QuestsView() {
  const { session } = usePlayerSession();
  const playerPosition = usePlayerPosition();
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
      supabase
        .from('quests')
        .select('*')
        .eq('game_id', session.game_id),
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
            <p className="placeholder-panel__text">
              Dołącz do gry, aby zobaczyć próby.
            </p>
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

  const chaseQuest = quests.find((q) => q.type === 'chase');
  const otherQuests = quests.filter((q) => q.type !== 'chase');

  return (
    <div className="view view--quests">
      <header className="view__header">
        <h1 className="view__title view__title--small">🗺️ Próby</h1>
        <p className="view__subtitle">Zadania dla Twojego Klanu</p>
      </header>

      <main className="view__content">
        {chaseQuest && (
          <ChaseQuestPanel
            quest={chaseQuest}
            playerPosition={playerPosition}
          />
        )}

        {otherQuests.length === 0 && !chaseQuest && (
          <div className="placeholder-panel glass-panel">
            <div className="placeholder-panel__icon">🗺️</div>
            <h2 className="placeholder-panel__title">Brak prób</h2>
            <p className="placeholder-panel__text">
              Mistrz Gry nie dodał jeszcze żadnych prób.
            </p>
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
}: {
  quest: QuestWithCompletion;
  playerPosition: { lat: number; lng: number } | null;
}) {
  const { activeSession, markerPosition, activating, activate } =
    useChaseQuest(quest, playerPosition);

  const isActive = !!activeSession;

  return (
    <div className={`chase-quest ${isActive ? 'chase-quest--active' : ''}`}>
      <div className="chase-quest__header">
        <span className="chase-quest__icon">🏇</span>
        <div className="chase-quest__info">
          <h3 className="chase-quest__title">{quest.title}</h3>
          <p className="chase-quest__desc">{quest.description}</p>
        </div>
        <span
          className={`chase-quest__status ${
            isActive ? 'chase-quest__status--active' : 'chase-quest__status--inactive'
          }`}
        >
          {isActive ? 'W TRAKCIE' : 'DOSTĘPNA'}
        </span>
      </div>

      <div className="chase-quest__meta">
        <span>🏆 +{quest.reward_points} pkt</span>
        {quest.type && <span>🏇 Gonitwa</span>}
      </div>

      {isActive && markerPosition && playerPosition && (
        <ChaseMapPreview
          playerPosition={playerPosition}
          markerPosition={markerPosition}
          catchDistance={activeSession?.catch_distance_m || 20}
        />
      )}

      {isActive && (
        <div className="chase-quest__instructions">
          🚴 Gonitwa w toku! Złap znacznik zanim ucieknie.
          {playerPosition && markerPosition && (
            <DistanceDisplay
              playerPosition={playerPosition}
              markerPosition={markerPosition}
            />
          )}
        </div>
      )}

      <button
        className="chase-quest__btn chase-quest__btn--activate"
        onClick={activate}
        disabled={!playerPosition || activating || isActive}
      >
        {!playerPosition
          ? 'Włącz GPS aby aktywować'
          : activating
          ? 'Uruchamianie...'
          : isActive
          ? 'Gonitwa aktywna...'
          : '🚀 Aktywuj gonitwę'}
      </button>
    </div>
  );
}

function DistanceDisplay({
  playerPosition,
  markerPosition,
}: {
  playerPosition: { lat: number; lng: number };
  markerPosition: { lat: number; lng: number };
}) {
  const R = 6371000;
  const dLat = ((markerPosition.lat - playerPosition.lat) * Math.PI) / 180;
  const dLng = ((markerPosition.lng - playerPosition.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((playerPosition.lat * Math.PI) / 180) *
      Math.cos((markerPosition.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = Math.round(R * c);

  return (
    <div className="chase-quest__distance">
      📍 {distance}m <span>do celu</span>
    </div>
  );
}

function ChaseMapPreview({
  playerPosition,
  markerPosition,
  catchDistance,
}: {
  playerPosition: { lat: number; lng: number };
  markerPosition: { lat: number; lng: number };
  catchDistance: number;
}) {
  const R = 6371000;
  const dLat = ((markerPosition.lat - playerPosition.lat) * Math.PI) / 180;
  const dLng = ((markerPosition.lng - playerPosition.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((playerPosition.lat * Math.PI) / 180) *
      Math.cos((markerPosition.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  const maxDisplayDistance = 500;
  const progress = Math.min(100, Math.max(0, ((maxDisplayDistance - distance) / maxDisplayDistance) * 100));

  return (
    <div className="chase-quest__progress">
      <div className="chase-quest__progress-label">
        📍 Odległość: {Math.round(distance)}m (cel: {catchDistance}m)
      </div>
      <div className="chase-quest__progress-bar">
        <div
          className="chase-quest__progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
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
        {quest.completed && (
          <span className="quest-card__badge">✓ UKOŃCZONE</span>
        )}
      </div>

      <div className="quest-card__meta">
        <span>🏆 +{quest.reward_points} pkt</span>
        {quest.type && <span>{quest.type.toUpperCase()}</span>}
        {quest.completed && quest.completed_at && (
          <span>
            {new Date(quest.completed_at).toLocaleDateString('pl-PL')}
          </span>
        )}
      </div>
    </div>
  );
}
