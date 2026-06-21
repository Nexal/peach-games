import { useState, useEffect, useRef } from 'react';
import { useAdminAuth } from '../../lib/admin/AdminAuth';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database.types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { TILE_LAYERS, DEFAULT_MAP_CONFIG } from '../../types/map.types';
import 'leaflet/dist/leaflet.css';

type Game = Database['public']['Tables']['games']['Row'];
type Klan = Database['public']['Tables']['klans']['Row'];
type Player = Database['public']['Tables']['players']['Row'];
type Quest = Database['public']['Tables']['quests']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];
type QuestActivation = Database['public']['Tables']['quest_activations']['Row'];
type TaskCompletion = Database['public']['Tables']['task_completions']['Row'];
type God = Database['public']['Tables']['gods']['Row'];

const DEFAULT_TTS_VOICE_ID = 'rpg9PEuAEDV7I1OjYrbj';

async function generateTTS(text: string, voiceId: string = DEFAULT_TTS_VOICE_ID, retries = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ text, voice_id: voiceId }),
        }
      );

      const data = await response.json();
      if (data.audio_url) {
        return data.audio_url;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    } catch (error) {
      console.error('[generateTTS] attempt', attempt, 'failed:', error);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  return null;
}

export function AdminDashboardView() {
  const { logout } = useAdminAuth();
  type AdminTab = 'games' | 'klans' | 'players' | 'quests' | 'submissions' | 'chat' | 'map';
  const [activeTab, setActiveTab] = useState<AdminTab>('games');
  const [games, setGames] = useState<Game[]>([]);
  const [klans, setKlans] = useState<Klan[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(() =>
    localStorage.getItem('peachgames_admin_selected_game_id')
  );
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [questActivations, setQuestActivations] = useState<QuestActivation[]>([]);
  const [taskCompletions, setTaskCompletions] = useState<TaskCompletion[]>([]);
  const [gods, setGods] = useState<God[]>([]);
  const [selectedGodId, setSelectedGodId] = useState<string | null>(() =>
    localStorage.getItem('peachgames_admin_selected_god_id')
  );

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      localStorage.setItem('peachgames_admin_selected_game_id', selectedGameId);
    } else {
      localStorage.removeItem('peachgames_admin_selected_game_id');
    }
  }, [selectedGameId]);

  useEffect(() => {
    if (selectedGodId) {
      localStorage.setItem('peachgames_admin_selected_god_id', selectedGodId);
    } else {
      localStorage.removeItem('peachgames_admin_selected_god_id');
    }
  }, [selectedGodId]);

  const loadGames = async () => {
    const { data } = await supabase.from('games').select('*').order('created_at', { ascending: false });
    if (data) {
      setGames(data);
      if (data.length > 0 && !selectedGameId) {
        setSelectedGameId(games.find((g) => g.status === 'active')?.id || data[0].id);
      }
      if (selectedGameId && data.length > 0 && !data.find((g) => g.id === selectedGameId)) {
        setSelectedGameId(games.find((g) => g.status === 'active')?.id || data[0].id);
      }
    }
  };

  const loadKlans = async (gameId: string) => {
    const { data } = await supabase.from('klans').select('*').eq('game_id', gameId);
    if (data) setKlans(data);
  };

  const loadGods = async (gameId: string) => {
    const { data } = await supabase
      .from('gods')
      .select('*, klans!inner(id, name, theme_color, game_id)')
      .eq('klans.game_id', gameId);
    if (data) {
      setGods(data);
      if (data.length > 0 && !selectedGodId) {
        setSelectedGodId(data[0].id);
      }
    }
  };

  const loadPlayers = async () => {
    const { data } = await supabase.from('players').select('*').order('created_at', { ascending: false });
    if (data) setPlayers(data);
  };

  const loadQuests = async (gameId: string) => {
    const { data } = await supabase.from('quests').select('*').eq('game_id', gameId);
    if (data) setQuests(data);
  };

  const loadTasks = async (gameId: string) => {
    const { data: questsData } = await supabase.from('quests').select('id').eq('game_id', gameId);
    if (!questsData || questsData.length === 0) {
      setTasks([]);
      setQuestActivations([]);
      setTaskCompletions([]);
      return;
    }
    const questIds = questsData.map(q => q.id);

    const { data: t } = await supabase.from('tasks').select('*').in('quest_id', questIds).order('sort_order');
    if (t) setTasks(t);

    const { data: qa } = await supabase.from('quest_activations').select('*').eq('game_id', gameId);
    if (qa) {
      setQuestActivations(qa);
      const ids = qa.map(a => a.id);
      if (ids.length > 0) {
        const { data: tc } = await supabase.from('task_completions').select('*').in('quest_activation_id', ids);
        if (tc) setTaskCompletions(tc);
      } else {
        setTaskCompletions([]);
      }
    }
  };

  const loadSubmissionsDirect = async (gameId: string) => {
    // Get klan IDs for this game first, then fetch submissions
    const { data: klansData } = await supabase.from('klans').select('id').eq('game_id', gameId);
    if (!klansData || klansData.length === 0) return;
    const klanIds = klansData.map(k => k.id);
    const { data } = await (supabase as any)
      .from('submissions')
      .select('*, tasks!inner(title, type), klans!inner(name, theme_color), quest_activations!inner(quests!inner(title))')
      .in('klan_id', klanIds)
      .order('submitted_at', { ascending: false });
    if (data) {
      const pending = data.filter((s: any) => s.status === 'pending');
      setPendingSubmissions(pending);
      setAllSubmissions(data);
      setSubmissionCount(pending.length);
    }
  };

  useEffect(() => {
    loadGames();
    loadPlayers();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadKlans(selectedGameId).then(() => {
        loadGods(selectedGameId);
        loadQuests(selectedGameId);
        loadTasks(selectedGameId);
        loadSubmissionsDirect(selectedGameId);
      });
    }
  }, [selectedGameId]);

  useEffect(() => {
    if (!selectedGameId) return;
    const channel = supabase
      .channel('admin:submissions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, () => {
        loadSubmissionsDirect(selectedGameId);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'submissions' }, () => {
        loadSubmissionsDirect(selectedGameId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedGameId]);

  const createGame = async (name: string) => {
    setLoading(true);
    const { data } = await supabase.rpc('create_game', { game_name: name }).select().single();
    if (data) {
      await loadGames();
      setSelectedGameId(data);
    }
    setLoading(false);
  };

  const updateGameStatus = async (gameId: string, status: string) => {
    await supabase.from('games').update({ status }).eq('id', gameId);

    if (status === 'active') {
      const game = games.find((g) => g.id === gameId);
      const gameName = game?.name || 'Noc Kupały';
      const announcementText = `Słuchajcie, śmiertelnicy! Czas próby nadszedł. Niech rozpocznie się ${gameName}!`;

      const firstGod = gods.find(g => {
        const klan = (g as any).klans;
        return klan?.game_id === gameId;
      });
      const voiceId = firstGod?.voice_id || 'rpg9PEuAEDV7I1OjYrbj';

      let audioUrl: string | null = null;
      try {
        audioUrl = await generateTTS(announcementText, voiceId);
      } catch (err) {
        console.error('[updateGameStatus] TTS generation failed:', err);
      }

      await supabase.from('messages').insert({
        content: announcementText,
        sender: firstGod?.name || 'Bóg',
        player_id: null,
        game_id: gameId,
        god_id: firstGod?.id || null,
        klan_id: null,
        sender_klan_id: null,
        tts_requested: true,
        audio_url: audioUrl,
      });
    }

    await loadGames();
  };

  const deleteGame = async (gameId: string) => {
    if (!confirm('Na pewno chcesz usunąć tę grę? To usunie też wszystkie klany i graczy.')) return;
    setLoading(true);
    await supabase.from('quest_completions').delete().eq('game_id', gameId);
    await supabase.from('messages').delete().eq('game_id', gameId);
    await supabase.from('players').delete().eq('game_id', gameId);
    await supabase.from('klans').delete().eq('game_id', gameId);
    await supabase.from('quests').delete().eq('game_id', gameId);
    await supabase.from('games').delete().eq('id', gameId);
    if (selectedGameId === gameId) setSelectedGameId(null);
    await loadGames();
    setLoading(false);
  };

  const completeQuest = async (questId: string, klanId: string, customPoints?: number) => {
    if (!selectedGameId || !questId || !klanId) return;
    const quest = quests.find(q => q.id === questId);
    const points = customPoints ?? quest?.reward_points ?? 0;

    const { data: existing } = await supabase
      .from('quest_completions')
      .select('id')
      .eq('quest_id', questId)
      .eq('klan_id', klanId)
      .eq('game_id', selectedGameId)
      .maybeSingle();

    if (existing) {
      await supabase.from('quest_completions').update({ completed_at: new Date().toISOString(), points_awarded: points }).eq('id', existing.id);
    } else {
      await supabase.from('quest_completions').insert({
        quest_id: questId,
        klan_id: klanId,
        game_id: selectedGameId,
        points_awarded: points,
        completed_by_player_id: null,
        completed_at: new Date().toISOString(),
      });
    }

    if (quest?.type === 'chase') {
      const { data: session } = await supabase
        .from('chase_sessions')
        .select('id')
        .eq('quest_id', questId)
        .eq('klan_id', klanId)
        .single();
      if (session) {
        await supabase.from('chase_sessions').update({ completed_at: new Date().toISOString() }).eq('id', session.id);
      }
    }

    const { data: klanData } = await supabase.from('klans').select('points').eq('id', klanId).maybeSingle();
    if (klanData) {
      await supabase.from('klans').update({ points: (klanData.points || 0) + points }).eq('id', klanId);
    }

    alert(`✅ Zaliczono quest "${quest?.title}" dla klanu (+${points} 🔥)`);
  };

  const resetQuest = async (questId: string) => {
    if (!selectedGameId || !confirm('Na pewno chcesz zresetować ten quest?')) return;
    await supabase.from('quest_completions').delete().eq('quest_id', questId).eq('game_id', selectedGameId);
    await supabase.from('chase_sessions').delete().eq('quest_id', questId);
    alert('🔄 Quest zresetowany');
  };

  const completeTask = async (questId: string, taskId: string, klanId: string, customPoints?: number) => {
    if (!selectedGameId) return;
    const task = tasks.find(t => t.id === taskId);
    const points = customPoints ?? task?.reward_points ?? 0;
    const quest = quests.find(q => q.id === questId);
    const questTitle = quest?.title || 'Nieznany quest';
    const taskTitle = task?.title || 'Nieznane zadanie';
    const klan = klans.find(k => k.id === klanId);

    let qa = questActivations.find(a => a.quest_id === questId && a.klan_id === klanId);
    if (!qa) {
      const { data: newQa } = await supabase.from('quest_activations').insert({
        quest_id: questId,
        klan_id: klanId,
        game_id: selectedGameId,
        activated_at: new Date().toISOString(),
      }).select().single();
      if (newQa) {
        qa = newQa;
        setQuestActivations(prev => [...prev, newQa]);
      }
    }
    if (!qa) return;

    const { error } = await supabase.from('task_completions').upsert({
      quest_activation_id: qa.id,
      task_id: taskId,
      completed_at: new Date().toISOString(),
      completed_by_player_id: null,
    }, { onConflict: 'quest_activation_id,task_id' });

    if (error) { alert('Błąd: ' + error.message); return; }

    const { data: klanData } = await supabase.from('klans').select('points').eq('id', klanId).maybeSingle();
    if (klanData) {
      await supabase.from('klans').update({ points: (klanData.points || 0) + points }).eq('id', klanId);
    }

    // Notyfikacja dla graczy o ukończeniu taska
    const klanName = klan?.name || 'Klan';
    await supabase.from('messages').insert({
      content: `${klanName} ukończył zadanie „${taskTitle}" w queście „${questTitle}" (+${points} 🔥)!`,
      sender: 'Bogowie',
      player_id: null,
      game_id: selectedGameId,
      god_id: null,
      klan_id: null,
      sender_klan_id: klanId,
      tts_requested: false,
    });

    // Sprawdź czy wszystkie taski questa są ukończone → auto-zalicz questa
    const questTasks = tasks.filter(t => t.quest_id === questId);
    const { count } = await supabase
      .from('task_completions')
      .select('*', { count: 'exact', head: true })
      .eq('quest_activation_id', qa.id);

    if (count && count >= questTasks.length) {
      const sumPoints = questTasks.reduce((sum, t) => sum + (t.reward_points || 0), 0);

      await supabase.from('quest_completions').insert({
        quest_id: questId,
        klan_id: klanId,
        game_id: selectedGameId,
        points_awarded: sumPoints,
        completed_by_player_id: null,
        completed_at: new Date().toISOString(),
      });

      await supabase.from('quest_activations').update({
        completed_at: new Date().toISOString(),
      }).eq('id', qa.id);

      await supabase.from('messages').insert({
        content: `${klanName} ukończył quest „${questTitle}" (+${sumPoints} 🔥)!`,
        sender: 'Bogowie',
        player_id: null,
        game_id: selectedGameId,
        god_id: null,
        klan_id: null,
        sender_klan_id: klanId,
        tts_requested: false,
      });
    }

    if (selectedGameId) loadTasks(selectedGameId);
  };

  const uncompleteTask = async (taskCompletionId: string, taskId: string, klanId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const points = task.reward_points ?? 0;

    await supabase.from('task_completions').delete().eq('id', taskCompletionId);

    const { data: klanData } = await supabase.from('klans').select('points').eq('id', klanId).maybeSingle();
    if (klanData) {
      await supabase.from('klans').update({ points: Math.max(0, (klanData.points || 0) - points) }).eq('id', klanId);
    }

    // Jeśli quest był automatycznie zaliczony przez wszystkie taski, cofnij to
    if (selectedGameId) {
      const { data: qc } = await supabase
        .from('quest_completions')
        .select('id')
        .eq('quest_id', task.quest_id)
        .eq('klan_id', klanId)
        .eq('game_id', selectedGameId)
        .maybeSingle();

      if (qc) {
        await supabase.from('quest_completions').delete().eq('id', qc.id);

        const qa = questActivations.find(a => a.quest_id === task.quest_id && a.klan_id === klanId);
        if (qa) {
          await supabase.from('quest_activations').update({ completed_at: null }).eq('id', qa.id);
        }
      }

      loadTasks(selectedGameId);
    }
  };

  const handleApproveSubmission = async (submissionId: string, taskId: string, questActivationId: string, klanId: string) => {
    const { data: submission } = await (supabase as any)
      .from('submissions')
      .select('*, tasks!inner(title, reward_points), quest_activations!inner(quests!inner(title))')
      .eq('id', submissionId)
      .single();
    if (!submission) return;

    const points = submission.tasks?.reward_points || 0;
    const taskTitle = submission.tasks?.title || 'Nieznane zadanie';
    const questTitle = submission.quest_activations?.quests?.title || 'Nieznany quest';

    // Update submission status
    await supabase.from('submissions').update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'admin',
    }).eq('id', submissionId);

    // Create task completion
    await (supabase as any).from('task_completions').upsert({
      quest_activation_id: questActivationId,
      task_id: taskId,
      completed_at: new Date().toISOString(),
      metadata: { media_url: submission.media_url, submission_id: submissionId },
    }, { onConflict: 'quest_activation_id,task_id' });

    // Update klan points
    const { data: klanData } = await supabase.from('klans').select('points').eq('id', klanId).maybeSingle();
    if (klanData) {
      await supabase.from('klans').update({ points: (klanData.points || 0) + points }).eq('id', klanId);
    }

    // Broadcast notification
    const { data: klanInfo } = await supabase.from('klans').select('name').eq('id', klanId).single();
    const klanName = klanInfo?.name || 'Klan';
    await supabase.from('messages').insert({
      content: `${klanName} ukończył zadanie „${taskTitle}" w queście „${questTitle}" (+${points} 🔥)!`,
      sender: 'Bogowie',
      player_id: null,
      game_id: selectedGameId,
      god_id: null,
      klan_id: null,
      sender_klan_id: klanId,
      tts_requested: false,
    });

    if (selectedGameId) loadSubmissionsDirect(selectedGameId);
    alert(`✅ Zatwierdzono zgłoszenie (+${points} 🔥)`);
  };

  const handleRejectSubmission = async (submissionId: string, comment: string) => {
    await supabase.from('submissions').update({
      status: 'rejected',
      admin_comment: comment,
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'admin',
    }).eq('id', submissionId);

    if (selectedGameId) loadSubmissionsDirect(selectedGameId);
  };
  return (
    <div className="view view--admin">
      <header className="admin-header">
        <div className="admin-header__left">
          <h1 className="admin-header__title">⚔️ Panel Mistrza Gry</h1>
        </div>
        <button onClick={logout} className="admin-header__logout">Wyloguj</button>
      </header>

      <main className="admin-content">
        {activeTab === 'games' && (
          <GamesPanel
            games={games}
            selectedGameId={selectedGameId}
            onSelectGame={setSelectedGameId}
            onCreateGame={createGame}
            onUpdateStatus={updateGameStatus}
            onDeleteGame={deleteGame}
            loading={loading}
            gods={gods}
            selectedGodId={selectedGodId}
            onSelectGod={setSelectedGodId}
          />
        )}
        {activeTab === 'klans' && (
          <KlansPanel klans={klans} gameId={selectedGameId} />
        )}
        {activeTab === 'players' && (
          <PlayersPanel players={players} klans={klans} gameId={selectedGameId} />
        )}
        {activeTab === 'quests' && selectedGameId && (
          <QuestsPanel
            quests={quests}
            klans={klans}
            gameId={selectedGameId}
            onComplete={completeQuest}
            onReset={resetQuest}
            tasks={tasks}
            questActivations={questActivations}
            taskCompletions={taskCompletions}
            onCompleteTask={completeTask}
            onUncompleteTask={uncompleteTask}
          />
        )}
        {activeTab === 'submissions' && selectedGameId && (
          <SubmissionsPanel
            submissions={pendingSubmissions}
            allSubmissions={allSubmissions}
            klans={klans}
            gameId={selectedGameId}
            onApprove={(submissionId, taskId, questActivationId, klanId) =>
              handleApproveSubmission(submissionId, taskId, questActivationId, klanId)
            }
            onReject={(submissionId, comment) => handleRejectSubmission(submissionId, comment)}
          />
        )}
        {activeTab === 'chat' && (
          <ChatPanel
            klans={klans}
            selectedGameId={selectedGameId}
            gods={gods}
            selectedGodId={selectedGodId}
          />
        )}
        {activeTab === 'map' && selectedGameId && (
          <MapPanel
            gameId={selectedGameId}
            klans={klans}
            selectedGodId={selectedGodId}
          />
        )}
      </main>

      <nav className="admin-tabs">
        <button
          className={`admin-tabs__item ${activeTab === 'games' ? 'admin-tabs__item--active' : ''}`}
          onClick={() => setActiveTab('games')}
        >
          🎮 Gry
        </button>
        <button
          className={`admin-tabs__item ${activeTab === 'klans' ? 'admin-tabs__item--active' : ''}`}
          onClick={() => setActiveTab('klans')}
        >
          ⚔️ Klany
        </button>
        <button
          className={`admin-tabs__item ${activeTab === 'players' ? 'admin-tabs__item--active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          👤 Gracze
        </button>
        <button
          className={`admin-tabs__item ${activeTab === 'quests' ? 'admin-tabs__item--active' : ''}`}
          onClick={() => setActiveTab('quests')}
        >
          🏆 Questy
        </button>
        <button
          className={`admin-tabs__item ${activeTab === 'submissions' ? 'admin-tabs__item--active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          ✅ Zatwierdź{submissionCount > 0 ? ` (${submissionCount})` : ''}
        </button>
        <button
          className={`admin-tabs__item ${activeTab === 'chat' ? 'admin-tabs__item--active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          ✨ Głos Bogów
        </button>
        <button
          className={`admin-tabs__item ${activeTab === 'map' ? 'admin-tabs__item--active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          🗺️ Mapa
        </button>
      </nav>
    </div>
  );
}

function GamesPanel({
  games,
  selectedGameId,
  onSelectGame,
  onCreateGame,
  onUpdateStatus,
  onDeleteGame,
  loading,
  gods,
  selectedGodId,
  onSelectGod,
}: {
  games: Game[];
  selectedGameId: string | null;
  onSelectGame: (id: string) => void;
  onCreateGame: (name: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onDeleteGame: (id: string) => void;
  loading: boolean;
  gods: God[];
  selectedGodId: string | null;
  onSelectGod: (id: string) => void;
}) {
  const [newGameName, setNewGameName] = useState('');

  return (
    <div className="admin-panel">
      <div className="admin-panel__section">
        <h2 className="admin-panel__title">Utwórz nową grę</h2>
        <div className="admin-panel__row">
          <input
            type="text"
            value={newGameName}
            onChange={(e) => setNewGameName(e.target.value)}
            placeholder="Nazwa gry..."
            className="admin-panel__input"
          />
          <button
            onClick={() => {
              if (newGameName.trim()) {
                onCreateGame(newGameName.trim());
                setNewGameName('');
              }
            }}
            disabled={loading}
            className="button-glow"
          >
            +
          </button>
        </div>
      </div>

      <div className="admin-panel__section">
        <h2 className="admin-panel__title">Lista gier</h2>
        <div className="admin-games-list">
          {games.length === 0 && <p className="admin-panel__empty">Brak gier</p>}
          {games.map((game) => (
            <div
              key={game.id}
              className={`admin-game-card ${selectedGameId === game.id ? 'admin-game-card--selected' : ''}`}
              onClick={() => onSelectGame(game.id)}
            >
              <div className="admin-game-card__info">
                <span className="admin-game-card__name">{game.name}</span>
                <span className={`admin-game-card__status admin-game-card__status--${game.status}`}>
                  {game.status}
                </span>
              </div>
              <div className="admin-game-card__actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteGame(game.id);
                  }}
                  className="admin-game-card__btn admin-game-card__btn--delete"
                >
                  🗑
                </button>
                {game.status === 'draft' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateStatus(game.id, 'active');
                    }}
                    className="admin-game-card__btn admin-game-card__btn--start"
                  >
                    ▶ Start
                  </button>
                )}
                {game.status === 'active' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateStatus(game.id, 'finished');
                    }}
                    className="admin-game-card__btn admin-game-card__btn--stop"
                  >
                    ⏹ Stop
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedGameId && gods.length > 0 && (
        <div className="admin-panel__section">
          <h2 className="admin-panel__title">Wybierz Boga</h2>
          <div className="admin-panel__row">
            <select
              value={selectedGodId || ''}
              onChange={(e) => onSelectGod(e.target.value)}
              className="admin-panel__select"
              style={{ flex: 1 }}
            >
              {gods.map((god) => {
                const klan = (god as any).klans;
                return (
                  <option key={god.id} value={god.id}>
                    {god.name}{klan ? ` (${klan.name})` : ''}
                  </option>
                );
              })}
            </select>
          </div>
          {selectedGodId && (
            <p className="admin-panel__hint">
              Przemawiasz jako: <strong>{gods.find(g => g.id === selectedGodId)?.name}</strong>
            </p>
          )}
        </div>
      )}

      {selectedGameId && (
        <div className="admin-panel__section">
          <h2 className="admin-panel__title">Link zapraszający</h2>
          <div className="admin-invite">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/join?game=${selectedGameId}`}
              className="admin-invite__input"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/join?game=${selectedGameId}`);
              }}
              className="button-glow admin-invite__copy"
            >
              📋
            </button>
          </div>
          <p className="admin-panel__hint">
            Udostępnij ten link graczom aby mogli dołączyć do gry
          </p>
        </div>
      )}
    </div>
  );
}

function KlansPanel({ klans, gameId }: { klans: Klan[]; gameId: string | null }) {
  const [points, setPoints] = useState<Record<string, number>>({});

  useEffect(() => {
    const initial: Record<string, number> = {};
    klans.forEach((k) => {
      initial[k.id] = k.points || 0;
    });
    setPoints(initial);
  }, [klans]);

  const updatePoints = async (klanId: string, newPoints: number) => {
    await supabase.from('klans').update({ points: newPoints }).eq('id', klanId);
  };

  if (!gameId) {
    return <div className="admin-panel__empty">Wybierz grę aby zarządzać klanami</div>;
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel__section">
        <h2 className="admin-panel__title">Klany w grze</h2>
        <div className="admin-klans-list">
          {klans.length === 0 && <p className="admin-panel__empty">Brak klanów</p>}
          {klans.map((klan) => (
            <div key={klan.id} className="admin-klan-card">
              <div
                className="admin-klan-card__color"
                style={{ backgroundColor: klan.theme_color }}
              />
              <span className="admin-klan-card__name">{klan.name}</span>
              <div className="admin-klan-card__points">
                <button
                  onClick={() => {
                    const newVal = Math.max(0, (points[klan.id] || 0) - 10);
                    setPoints({ ...points, [klan.id]: newVal });
                    updatePoints(klan.id, newVal);
                  }}
                >
                  -
                </button>
                <span>{points[klan.id] || 0}</span>
                <button
                  onClick={() => {
                    const newVal = (points[klan.id] || 0) + 10;
                    setPoints({ ...points, [klan.id]: newVal });
                    updatePoints(klan.id, newVal);
                  }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayersPanel({ 
  players, 
  klans, 
  gameId 
}: { 
  players: Player[]; 
  klans: Klan[]; 
  gameId: string | null;
}) {
  const [selectedKlanId, setSelectedKlanId] = useState<string>('');
  const [playerName, setPlayerName] = useState('');
  const [isTestPlayer, setIsTestPlayer] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState('');

  const gamePlayers = players.filter(p => p.game_id === gameId);
  const gameKlans = klans.filter(k => k.game_id === gameId);

  const addPlayer = async () => {
    if (!playerName.trim() || !selectedKlanId || !gameId) return;

    await supabase.from('players').insert({
      name: playerName.trim(),
      klan_id: selectedKlanId,
      game_id: gameId,
      role: 'member',
      is_test: isTestPlayer,
    });
    setPlayerName('');
    setIsTestPlayer(false);
    window.location.reload();
  };

  const deletePlayer = async (playerId: string) => {
    await supabase.from('players').delete().eq('id', playerId);
    window.location.reload();
  };

  const startEdit = (player: Player) => {
    setEditingPlayer(player);
    setEditName(player.name);
  };

  const saveEdit = async () => {
    if (!editingPlayer || !editName.trim()) return;
    
    await supabase.from('players').update({ name: editName.trim() }).eq('id', editingPlayer.id);
    setEditingPlayer(null);
    setEditName('');
    window.location.reload();
  };

  if (!gameId) {
    return <div className="admin-panel__empty">Wybierz grę aby zarządzać graczami</div>;
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel__section">
        <h2 className="admin-panel__title">Dodaj gracza</h2>
        <div className="admin-panel__row">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Imię gracza..."
            className="admin-panel__input"
          />
          <select
            value={selectedKlanId}
            onChange={(e) => setSelectedKlanId(e.target.value)}
            className="admin-panel__select"
          >
            <option value="">Wybierz klan</option>
            {gameKlans.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
            </select>
            <label className="admin-panel__checkbox-label">
              <input
                type="checkbox"
                checked={isTestPlayer}
                onChange={(e) => setIsTestPlayer(e.target.checked)}
              />
              <span>🧪 Testowy</span>
            </label>
            <button onClick={addPlayer} className="button-glow">
            +
          </button>
        </div>
      </div>

      <div className="admin-panel__section">
        <h2 className="admin-panel__title">Gracze w grze ({gamePlayers.length})</h2>
        <div className="admin-players-list">
          {gamePlayers.length === 0 && <p className="admin-panel__empty">Brak graczy w tej grze</p>}
          {gamePlayers.map((player) => {
            const klan = klans.find((k) => k.id === player.klan_id);
            return (
              <div key={player.id} className="admin-player-card admin-player-card--editable">
                {editingPlayer?.id === player.id ? (
                  <div className="admin-player-card__edit">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="admin-player-card__edit-input"
                      autoFocus
                    />
                    <button onClick={saveEdit} className="admin-player-card__btn admin-player-card__btn--save">✓</button>
                    <button onClick={() => setEditingPlayer(null)} className="admin-player-card__btn">✕</button>
                  </div>
                ) : (
                  <>
                    <span className="admin-player-card__name">{player.name}</span>
                    {player.is_test && <span className="admin-player-card__test-badge">🧪</span>}
                    <div className="admin-player-card__actions">
                      <span
                        className="admin-player-card__klan"
                        style={{ color: klan?.theme_color }}
                      >
                        {klan?.name || 'Brak'}
                      </span>
                      <button onClick={() => startEdit(player)} className="admin-player-card__btn">✏️</button>
                      <button onClick={() => deletePlayer(player.id)} className="admin-player-card__btn admin-player-card__btn--delete">🗑️</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QuestsPanel({
  quests,
  klans,
  gameId,
  tasks,
  questActivations,
  taskCompletions,
  onComplete,
  onReset,
  onCompleteTask,
  onUncompleteTask,
}: {
  quests: Quest[];
  klans: Klan[];
  gameId: string;
  tasks: Task[];
  questActivations: QuestActivation[];
  taskCompletions: TaskCompletion[];
  onComplete: (questId: string, klanId: string, customPoints?: number) => void;
  onReset: (questId: string) => void;
  onCompleteTask: (questId: string, taskId: string, klanId: string, customPoints?: number) => void;
  onUncompleteTask: (taskCompletionId: string, taskId: string, klanId: string) => void;
}) {
  const [selectedQuestId, setSelectedQuestId] = useState<string>('');
  const [selectedKlanId, setSelectedKlanId] = useState<string>('');
  const [customPoints, setCustomPoints] = useState<string>('');
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);
  const [completions, setCompletions] = useState<Database['public']['Tables']['quest_completions']['Row'][]>([]);

  useEffect(() => {
    supabase
      .from('quest_completions')
      .select('*')
      .eq('game_id', gameId)
      .then(({ data }) => { if (data) setCompletions(data); });
  }, [gameId]);

  const selectedQuest = quests.find(q => q.id === selectedQuestId);
  const defaultPoints = selectedQuest?.reward_points || 0;

  const handleComplete = () => {
    if (!selectedQuestId || !selectedKlanId) {
      alert('Wybierz quest i klan');
      return;
    }
    const pts = customPoints ? parseInt(customPoints) : undefined;
    onComplete(selectedQuestId, selectedKlanId, pts);
    setCustomPoints('');
    supabase.from('quest_completions').select('*').eq('game_id', gameId).then(({ data }) => { if (data) setCompletions(data); });
  };

  if (!gameId) {
    return <div className="admin-panel__empty">Wybierz grę aby zarządzać questami</div>;
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel__section">
        <h2 className="admin-panel__title">Zalicz quest ręcznie</h2>
        <div className="admin-panel__row">
          <select
            value={selectedQuestId}
            onChange={(e) => {
              setSelectedQuestId(e.target.value);
              setCustomPoints('');
            }}
            className="admin-panel__select"
          >
            <option value="">-- Wybierz quest --</option>
            {quests.map(q => (
              <option key={q.id} value={q.id}>
                {q.type === 'chase' ? '🏇 ' : q.type === 'gps' ? '📍 ' : q.type === 'qr' ? '📱 ' : ''}
                {q.title} ({q.reward_points} 🔥)
              </option>
            ))}
          </select>
        </div>

        <div className="admin-panel__row" style={{ marginTop: 12 }}>
          <select
            value={selectedKlanId}
            onChange={(e) => setSelectedKlanId(e.target.value)}
            className="admin-panel__select"
          >
            <option value="">-- Wybierz klan --</option>
            {klans.filter(k => k.game_id === gameId).map(k => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-panel__row" style={{ marginTop: 12 }}>
          <input
            type="number"
            value={customPoints}
            onChange={(e) => setCustomPoints(e.target.value)}
            placeholder={`Punkty (domyślnie: ${defaultPoints})`}
            className="admin-panel__input"
            style={{ maxWidth: 200 }}
          />
          <button onClick={handleComplete} className="button-glow" disabled={!selectedQuestId || !selectedKlanId}>
            ✅ Zalicz
          </button>
        </div>
      </div>

      <div className="admin-panel__section">
        <h2 className="admin-panel__title">Questy w grze ({quests.length})</h2>
        <div className="admin-quests-list">
          {quests.length === 0 && <p className="admin-panel__empty">Brak questów w tej grze</p>}
          {quests.map(quest => {
            const questCompletions = completions.filter(c => c.quest_id === quest.id);
            const isCompleted = questCompletions.length > 0;
            const questTasks = tasks.filter(t => t.quest_id === quest.id).sort((a, b) => a.sort_order - b.sort_order);
            const isExpanded = expandedQuestId === quest.id;
            return (
              <div key={quest.id} className={`admin-quest-card ${isCompleted ? 'admin-quest-card--done' : ''}`}>
                <div className="admin-quest-card__header">
                  <span className="admin-quest-card__icon">
                    {quest.type === 'chase' ? '🏇' : quest.type === 'gps' ? '📍' : quest.type === 'qr' ? '📱' : quest.type === 'photo' ? '📷' : '🧩'}
                  </span>
                  <div className="admin-quest-card__info">
                    <span className="admin-quest-card__title">{quest.title}</span>
                    <span className="admin-quest-card__desc">{quest.description}</span>
                  </div>
                  <div className="admin-quest-card__meta">
                    <span className="admin-quest-card__points">+{quest.reward_points} 🔥</span>
                    {quest.type && <span className="admin-quest-card__type">{quest.type}</span>}
                  </div>
                </div>

                {questTasks.length > 0 && (
                  <button
                    className="admin-quest-card__expand-btn"
                    onClick={() => setExpandedQuestId(isExpanded ? null : quest.id)}
                  >
                    {isExpanded ? '▲' : '▼'} Taski ({questTasks.length})
                  </button>
                )}

                {isExpanded && questTasks.length > 0 && (
                  <div className="admin-quest-card__tasks">
                    {questTasks.map(task => {
                      const klansInGame = klans.filter(k => k.game_id === gameId);
                      return (
                        <TaskRow
                          key={task.id}
                          task={task}
                          klans={klansInGame}
                          questActivations={questActivations}
                          taskCompletions={taskCompletions}
                          questId={quest.id}
                          onCompleteTask={onCompleteTask}
                          onUncompleteTask={onUncompleteTask}
                        />
                      );
                    })}
                  </div>
                )}

                {questCompletions.length > 0 && (
                  <div className="admin-quest-card__completions">
                    {questCompletions.map(c => {
                      const klan = klans.find(k => k.id === c.klan_id);
                      return (
                        <span key={c.id} className="admin-quest-card__completion" style={{ borderColor: klan?.theme_color }}>
                          ✅ {klan?.name} (+{c.points_awarded} 🔥)
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="admin-quest-card__actions">
                  {quest.type === 'chase' && (
                    <button
                      onClick={() => onReset(quest.id)}
                      className="admin-quest-card__btn"
                      title="Zresetuj (usuwa wszystkie ukończenia)"
                    >
                      🔄 Reset
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  klans,
  questActivations,
  taskCompletions,
  questId,
  onCompleteTask,
  onUncompleteTask,
}: {
  task: Task;
  klans: Klan[];
  questActivations: QuestActivation[];
  taskCompletions: TaskCompletion[];
  questId: string;
  onCompleteTask: (questId: string, taskId: string, klanId: string, customPoints?: number) => void;
  onUncompleteTask: (taskCompletionId: string, taskId: string, klanId: string) => void;
}) {
  const [selectedKlanId, setSelectedKlanId] = useState<string>(klans[0]?.id || '');
  const [customPoints, setCustomPoints] = useState<string>('');

  const qa = questActivations.find(a => a.quest_id === questId && a.klan_id === selectedKlanId);
  const tc = qa
    ? taskCompletions.find(tc => tc.quest_activation_id === qa.id && tc.task_id === task.id)
    : null;
  const isTaskDone = !!tc;

  const taskIcon = task.type === 'qr' ? '📱' : task.type === 'gps' ? '📍' : task.type === 'photo' ? '📷' : task.type === 'logic' ? '🧩' : task.type === 'chase' ? '🏇' : '📋';

  return (
    <div className="admin-task-row">
      <div className="admin-task-row__header">
        <span className="admin-task-row__icon">{taskIcon}</span>
        <span className="admin-task-row__info">
          <span className="admin-task-row__title">{task.title}</span>
        </span>
        <span className="admin-task-row__points">+{task.reward_points} 🔥</span>
        <span className={`admin-task-row__status ${isTaskDone ? 'admin-task-row__status--done' : 'admin-task-row__status--pending'}`}>
          {isTaskDone ? '✅' : '⬜'}
        </span>
      </div>
      <div className="admin-task-row__actions">
        <select
          value={selectedKlanId}
          onChange={(e) => setSelectedKlanId(e.target.value)}
          className="admin-task-row__klan-select"
        >
          {klans.map(k => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
        <input
          type="number"
          value={customPoints}
          onChange={(e) => setCustomPoints(e.target.value)}
          placeholder={`punkty (${task.reward_points})`}
          className="admin-task-row__points-input"
        />
        {!isTaskDone ? (
          <button
            className="admin-task-row__btn"
            onClick={() => {
              const pts = customPoints ? parseInt(customPoints) : undefined;
              onCompleteTask(questId, task.id, selectedKlanId, pts);
              setCustomPoints('');
            }}
          >
            ✅ Zalicz
          </button>
        ) : (
          <button
            className="admin-task-row__btn admin-task-row__btn--danger"
            onClick={() => onUncompleteTask(tc!.id, task.id, selectedKlanId)}
          >
            ⬅️ Cofnij
          </button>
        )}
      </div>
    </div>
  );
}

function SubmissionsPanel({
  submissions,
  allSubmissions,
  klans,
  gameId,
  onApprove,
  onReject,
}: {
  submissions: any[];
  allSubmissions: any[];
  klans: Klan[];
  gameId: string;
  onApprove: (id: string, taskId: string, activationId: string, klanId: string) => void;
  onReject: (id: string, comment: string) => void;
}) {
  const [rejectComment, setRejectComment] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);

  const reviewedSubmissions = allSubmissions.filter((s: any) => s.status !== 'pending');

  if (!gameId) {
    return <div className="admin-panel__empty">Wybierz grę aby przeglądać zgłoszenia</div>;
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel__section">
        <h2 className="admin-panel__title">⏳ Oczekujące ({submissions.length})</h2>
        {submissions.length === 0 && <p className="admin-panel__empty">Brak oczekujących zgłoszeń</p>}
        {submissions.map((sub: any) => {
          const klan = klans.find(k => k.id === sub.klan_id);
          const taskTitle = sub.tasks?.title || 'Nieznane zadanie';
          const questTitle = sub.quest_activations?.quests?.title || 'Nieznany quest';
          return (
            <div key={sub.id} className="admin-submission-card">
              <div className="admin-submission-card__header">
                <div className="admin-submission-card__info">
                  <span className="admin-submission-card__quest">{questTitle}</span>
                  <span className="admin-submission-card__task">{taskTitle}</span>
                  <span className="admin-submission-card__klan" style={{ color: klan?.theme_color }}>
                    {klan?.name || 'Brak klanu'}
                  </span>
                  <span className="admin-submission-card__time">
                    {new Date(sub.submitted_at).toLocaleString('pl-PL')}
                  </span>
                </div>
                <span className={`admin-submission-card__badge admin-submission-card__badge--${sub.media_type}`}>
                  {sub.media_type === 'photo' ? '📷 Zdjęcie' : '🎥 Wideo'}
                </span>
              </div>
              <div className="admin-submission-card__media">
                {sub.media_type === 'photo' ? (
                  <img src={sub.media_url} alt="Zgłoszenie" className="admin-submission-card__image" />
                ) : (
                  <video src={sub.media_url} controls className="admin-submission-card__video" />
                )}
              </div>
              <div className="admin-submission-card__actions">
                <button
                  className="admin-submission-card__btn admin-submission-card__btn--approve"
                  onClick={() => onApprove(sub.id, sub.task_id, sub.quest_activation_id, sub.klan_id)}
                >
                  ✅ Zatwierdź
                </button>
                <button
                  className="admin-submission-card__btn admin-submission-card__btn--reject"
                  onClick={() => {
                    const comment = rejectComment[sub.id] || '';
                    onReject(sub.id, comment);
                    setRejectComment(prev => ({ ...prev, [sub.id]: '' }));
                  }}
                >
                  ❌ Odrzuć
                </button>
                <input
                  type="text"
                  value={rejectComment[sub.id] || ''}
                  onChange={(e) => setRejectComment(prev => ({ ...prev, [sub.id]: e.target.value }))}
                  placeholder="Komentarz (opcjonalnie)..."
                  className="admin-submission-card__comment"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="admin-panel__section">
        <button
          className="admin-panel__toggle"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? '▼' : '▶'} Historia ({reviewedSubmissions.length})
        </button>
        {showHistory && reviewedSubmissions.length === 0 && (
          <p className="admin-panel__empty">Brak historii</p>
        )}
        {showHistory && reviewedSubmissions.map((sub: any) => {
          const klan = klans.find(k => k.id === sub.klan_id);
          return (
            <div key={sub.id} className={`admin-submission-card admin-submission-card--reviewed admin-submission-card--${sub.status}`}>
              <div className="admin-submission-card__header">
                <div className="admin-submission-card__info">
                  <span className="admin-submission-card__quest">{sub.tasks?.title || ''}</span>
                  <span className="admin-submission-card__klan" style={{ color: klan?.theme_color }}>
                    {klan?.name || ''}
                  </span>
                </div>
                <span className={`admin-submission-card__badge admin-submission-card__badge--${sub.status}`}>
                  {sub.status === 'approved' ? '✅' : '❌'} {sub.status === 'approved' ? 'Zatwierdzone' : 'Odrzucone'}
                </span>
              </div>
              {sub.admin_comment && (
                <div className="admin-submission-card__admin-comment">
                  💬 {sub.admin_comment}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Message = Database['public']['Tables']['messages']['Row'];

const GOD_ICONS: Record<string, string> = {
  'Perun': '/icons/perun_avatar.png',
  'Weles': '/icons/weles_avatar.jpeg',
  'Mokosz': '/icons/mokosz_avatar.jpeg',
  'Bogowie': '',
};

function ChatPanel({
  klans,
  selectedGameId,
  gods,
  selectedGodId,
}: {
  klans: Klan[];
  selectedGameId: string | null;
  gods: God[];
  selectedGodId: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedKlanId, setSelectedKlanId] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [broadcastToAll, setBroadcastToAll] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const audioPlayersRef = useRef<Record<string, HTMLAudioElement>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [playerAvatarMap, setPlayerAvatarMap] = useState<Record<string, string | null>>({});

  const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Could not get canvas context')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error('Could not compress image')); }, 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!selectedGameId) return null;
    try {
      const compressed = await compressImage(file);
      const fileName = `${crypto.randomUUID()}.jpg`;
      const filePath = `${selectedGameId}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('chat-images').upload(filePath, compressed, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) { console.error('Upload error:', uploadError); return null; }
      const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (err) { console.error('Image upload failed:', err); return null; }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (selectedGameId) {
      const activeGameKlans = klans.filter((k) => k.game_id === selectedGameId);
      if (activeGameKlans.length > 0 && !selectedKlanId) {
        setSelectedKlanId(activeGameKlans[0].id);
      }
    }
  }, [selectedGameId, klans]);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel('admin:messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          ...(selectedGameId ? { filter: `game_id=eq.${selectedGameId}` } : {}),
        },
        (payload: { new: Message }) => {
          const newMsg = payload.new;
          if (selectedGameId && newMsg.game_id !== selectedGameId) return;
          if (selectedKlanId) {
            if (newMsg.klan_id !== selectedKlanId) return;
          } else {
            if (newMsg.klan_id !== null) return;
          }
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGameId, selectedKlanId]);

  useEffect(() => {
    if (selectedGameId) {
      supabase.from('players').select('id, avatar_url').eq('game_id', selectedGameId)
        .then(({ data }) => {
          if (data) {
            const map: Record<string, string | null> = {};
            data.forEach(p => { map[p.id] = p.avatar_url; });
            setPlayerAvatarMap(map);
          }
        });
    }
  }, [selectedGameId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, []);

  const loadMessages = async () => {
    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (selectedGameId) {
      query = query.eq('game_id', selectedGameId);
    }
    if (selectedKlanId) {
      query = query.eq('klan_id', selectedKlanId);
    } else {
      query = query.is('klan_id', null);
    }

      const { data } = await query;
      if (data) setMessages(data.reverse());
  };

  const generateTTS = async (text: string, voiceId: string, retries = 3): Promise<string | null> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(
          'https://xmanqwjuqylwhizkqjsi.supabase.co/functions/v1/generate-tts',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ text, voice_id: voiceId }),
          }
        );

        const data = await response.json();
        if (data.audio_url) {
          return data.audio_url;
        }
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      } catch (error) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }
    return null;
  };

  const selectedGod = gods.find(g => g.id === selectedGodId);
  const selectedGodVoiceId = selectedGod?.voice_id || 'rpg9PEuAEDV7I1OjYrbj';

  const generatePreview = async () => {
    if (!inputText.trim()) return;

    setIsGeneratingPreview(true);
    setPreviewAudio(null);

    const audioUrl = await generateTTS(inputText, selectedGodVoiceId);
    if (audioUrl) {
      setPreviewAudio(audioUrl);
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioPreviewRef.current = audio;
      audio.play();
    } else {
      alert('Błąd generowania audio. Spróbuj ponownie.');
    }
    setIsGeneratingPreview(false);
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !selectedImage) return;

    let audioUrl: string | null = previewAudio;
    let imageUrl: string | null = null;

    if (ttsEnabled && !audioUrl) {
      setIsGeneratingPreview(true);
      audioUrl = await generateTTS(inputText, selectedGodVoiceId);
      setIsGeneratingPreview(false);
    }

    if (selectedImage) {
      imageUrl = await uploadImage(selectedImage);
    }

    const godKlanId = selectedGod?.klan_id || null;

    if (broadcastToAll) {
      await supabase.from('messages').insert({
        content: inputText.trim() || (imageUrl ? '📷' : ''),
        sender: selectedGod?.name || 'Bóg',
        player_id: null,
        game_id: selectedGameId,
        god_id: selectedGodId,
        klan_id: null,
        sender_klan_id: godKlanId,
        tts_requested: ttsEnabled,
        audio_url: audioUrl,
        image_url: imageUrl,
      });
    } else {
      await supabase.from('messages').insert({
        content: inputText.trim() || (imageUrl ? '📷' : ''),
        sender: selectedGod?.name || 'Bóg',
        player_id: null,
        game_id: selectedGameId,
        god_id: selectedGodId,
        klan_id: selectedKlanId,
        sender_klan_id: godKlanId,
        tts_requested: ttsEnabled,
        audio_url: audioUrl,
        image_url: imageUrl,
      });
    }

    setInputText('');
    setPreviewAudio(null);
    clearImage();
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
  };

  const playHistoricalAudio = (msg: Message) => {
    if (audioPlayersRef.current[msg.id]) {
      audioPlayersRef.current[msg.id].pause();
      delete audioPlayersRef.current[msg.id];
      return;
    }
    if (msg.audio_url) {
      const audio = new Audio(msg.audio_url);
      audioPlayersRef.current[msg.id] = audio;
      audio.play();
      audio.onended = () => {
        delete audioPlayersRef.current[msg.id];
      };
    }
  };

  const deleteMessage = async (msg: Message) => {
    const confirmed = window.confirm(`Usunąć wiadomość?\n\n"${msg.content}"`);
    if (!confirmed) return;
    setInputText(msg.content);
    await supabase.from('messages').delete().eq('id', msg.id);
  };

  const selectedKlan = klans.find((k) => k.id === selectedKlanId);

  const gameKlans = klans.filter((k) => k.game_id === selectedGameId);

  return (
    <div className="admin-panel admin-panel--chat">
      <div className="admin-panel__section admin-panel__section--chat-controls">
        <div className="admin-chat__channels">
          <button
            className={`admin-chat__channel-btn ${selectedKlanId === null ? 'admin-chat__channel-btn--active' : ''}`}
            onClick={() => setSelectedKlanId(null)}
          >
            🌍 Publiczny
          </button>
          {gameKlans.map((k) => (
            <button
              key={k.id}
              className={`admin-chat__channel-btn ${selectedKlanId === k.id ? 'admin-chat__channel-btn--active' : ''}`}
              style={selectedKlanId === k.id && k.theme_color ? { borderColor: k.theme_color, background: `${k.theme_color}20` } : undefined}
              onClick={() => setSelectedKlanId(k.id)}
            >
              {k.name}
            </button>
          ))}
        </div>
        <label className="admin-chat__tts">
          <input
            type="checkbox"
            checked={ttsEnabled}
            onChange={(e) => setTtsEnabled(e.target.checked)}
          />
          🔊 TTS (tekst na głos)
        </label>
        {ttsEnabled && (
          <div className="admin-chat__voice-select">
            <button
              onClick={generatePreview}
              disabled={!inputText.trim() || isGeneratingPreview}
              className="admin-chat__preview-btn"
            >
              {isGeneratingPreview ? '⏳ Generowanie...' : '🔊 Odsłuchaj'}
            </button>
          </div>
        )}
        {previewAudio && (
          <div className="admin-chat__preview-player">
            <span>Podgląd:</span>
            <audio controls src={previewAudio} />
          </div>
        )}
      </div>

      <div className="admin-panel__section admin-chat">
        <h2 className="admin-panel__title">
          {selectedKlan ? `💬 Czat: ${selectedKlan.name}` : '💬 Czat Publiczny'}
        </h2>
        <div className="admin-chat__messages">
          {messages.length === 0 && (
            <p className="admin-panel__empty">Brak wiadomości</p>
          )}
          {messages.map((msg) => {
            const clan = klans.find((k) => k.id === (msg.sender_klan_id || msg.klan_id));
            const isGodMessage = !!msg.god_id || msg.sender === 'Bogowie';
            const isSystemNotification = msg.sender === 'Bogowie';
            const isPlaying = audioPlayersRef.current[msg.id] && !audioPlayersRef.current[msg.id].paused;
            const klanColor = clan?.theme_color;
            const isSelectedKlan = selectedKlanId && msg.klan_id === selectedKlanId;
            const senderAvatarUrl = !isGodMessage && msg.player_id ? (playerAvatarMap[msg.player_id] || null) : null;
            const godIcon = isGodMessage ? (GOD_ICONS[msg.sender] || '') : '';
            return (
              <div
                key={msg.id}
                className={`admin-chat__message ${isGodMessage ? 'admin-chat__message--god' : ''} ${isSystemNotification ? 'admin-chat__message--broadcast' : ''} ${isSelectedKlan ? 'admin-chat__message--selected-klan' : ''}`}
                style={isGodMessage && klanColor ? { borderLeft: `4px solid ${klanColor}` } : !isGodMessage && klanColor ? { borderLeft: `4px solid ${klanColor}` } : undefined}
              >
                {isSystemNotification && (
                  <div className="chat-message__broadcast-badge">📢 Ogłoszenie</div>
                )}
                <div className="admin-chat__message-header">
                  <span className="admin-chat__message-sender">
                    {isGodMessage
                      ? <>{godIcon ? <img src={godIcon} alt={msg.sender} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', marginRight: 4, verticalAlign: 'middle' }} /> : <span>📢</span>} {msg.sender}{clan ? ` (${clan.name})` : ''}</>
                      : <>{senderAvatarUrl ? <img src={senderAvatarUrl} alt={msg.sender} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', marginRight: 4, verticalAlign: 'middle', cursor: 'pointer' }} onClick={() => setEnlargedImage(senderAvatarUrl)} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} /> : null}{msg.sender}{clan ? ` (${clan.name})` : ''}</>}
                    {msg.tts_requested && ' 🔊'}
                  </span>
                  <div className="admin-chat__message-actions">
                    {msg.audio_url && (
                      <button
                        className="admin-chat__action-btn"
                        onClick={() => playHistoricalAudio(msg)}
                        title="Odsłuchaj"
                      >
                        {isPlaying ? '⏸' : '▶'}
                      </button>
                    )}
                    {isGodMessage && (
                      <button
                        className="admin-chat__action-btn admin-chat__action-btn--delete"
                        onClick={() => deleteMessage(msg)}
                        title="Usuń (przenieś do edycji)"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                <span className="admin-chat__message-content">{msg.content}</span>
                {msg.image_url && (
                  <img src={msg.image_url} alt="Załącznik" className="admin-chat__message-image" onClick={() => setEnlargedImage(msg.image_url)} />
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        {imagePreview && (
          <div className="admin-chat__image-preview">
            <img src={imagePreview} alt="Podgląd" />
            <button type="button" onClick={clearImage} className="admin-chat__image-preview-remove">✕</button>
          </div>
        )}
        <div className="admin-chat__input-row">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="admin-chat__camera-btn"
            title="Załącz zdjęcie"
          >
            📷
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              broadcastToAll
                ? '📢 Broadcast do wszystkich...'
                : selectedKlan
                  ? `Wiadomość od Bogów do ${selectedKlan.name}...`
                  : 'Wiadomość na kanał Publiczny...'
            }
            className="admin-chat__input"
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={(!inputText.trim() && !selectedImage) || isGeneratingPreview}
            className="button-glow"
          >
            {isGeneratingPreview ? '⏳ Generowanie audio...' : 'Wyślij'}
          </button>
        </div>
        <label className="admin-chat__broadcast">
          <input
            type="checkbox"
            checked={broadcastToAll}
            onChange={(e) => setBroadcastToAll(e.target.checked)}
          />
          📢 Broadcast (widoczny dla wszystkich)
        </label>
      </div>

      {enlargedImage && (
        <div className="chat-image-modal" onClick={() => setEnlargedImage(null)}>
          <div className="chat-image-modal__content" onClick={(e) => e.stopPropagation()}>
            <button className="chat-image-modal__close" onClick={() => setEnlargedImage(null)}>✕</button>
            <img src={enlargedImage} alt="Powiększenie" className="chat-image-modal__img" />
          </div>
        </div>
      )}
    </div>
  );
}

interface MapPanelProps {
  gameId: string;
  klans: Klan[];
  selectedGodId: string | null;
}

function MapPanel({ gameId, klans, selectedGodId }: MapPanelProps) {
  const [positions, setPositions] = useState<any[]>([]);
  const [godPositions, setGodPositions] = useState<any[]>([]);

  useEffect(() => {
    const fetchPositions = async () => {
      const { data } = await supabase
        .from('player_positions')
        .select(`
          player_id,
          lat,
          lng,
          accuracy,
          updated_at,
          players!inner (
            id,
            name,
            klan_id,
            avatar_url,
            klans!inner (
              id,
              name,
              theme_color
            )
          )
        `)
        .eq('game_id', gameId)
        .gt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .order('updated_at', { ascending: false });

      if (data) {
        setPositions(data);
      }
    };

    const fetchGodPositions = async () => {
      const { data } = await supabase
        .from('god_positions')
        .select(`
          god_id,
          lat,
          lng,
          accuracy,
          updated_at,
          gods!inner (
            id,
            name,
            voice_id,
            klans!inner (
              id,
              name,
              theme_color
            )
          )
        `)
        .eq('game_id', gameId)
        .gt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

      if (data) {
        setGodPositions(data);
      }
    };

    fetchPositions();
    fetchGodPositions();

    const channel = supabase
      .channel('admin_map_positions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_positions',
        filter: `game_id=eq.${gameId}`,
      }, () => {
        fetchPositions();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'god_positions',
        filter: `game_id=eq.${gameId}`,
      }, () => {
        fetchGodPositions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  useEffect(() => {
    if (!selectedGodId) return;

    let watchId: number | null = null;

    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          supabase
            .from('god_positions')
            .upsert({
              god_id: selectedGodId,
              game_id: gameId,
              lat: latitude,
              lng: longitude,
              accuracy: accuracy,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'god_id' })
            .then(({ error }) => { if (error) console.error('[God GPS] Error:', error); });
        },
        (error) => console.error('[God GPS] Error:', error),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [selectedGodId, gameId]);

  const getKlanColor = (klanId: string | null) => {
    if (!klanId) return '#888888';
    const klan = klans.find(k => k.id === klanId);
    return klan?.theme_color || '#888888';
  };

  return (
    <div className="admin-map-panel">
      <div className="admin-map-panel__header">
        <h2>🗺️ Pozycje Graczy</h2>
        <span className="admin-map-panel__count">
          {positions.length} graczy online
        </span>
        {godPositions.length > 0 && (
          <span className="admin-map-panel__count admin-map-panel__count--god">
            {godPositions.length} bogów online
          </span>
        )}
      </div>

      <div className="admin-map-panel__container">
        <MapContainer
          center={DEFAULT_MAP_CONFIG.center}
          zoom={DEFAULT_MAP_CONFIG.zoom}
          className="admin-map"
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            url={TILE_LAYERS.dark.url}
            attribution={TILE_LAYERS.dark.attribution}
          />

          {/* Base campfire marker */}
          <Marker position={DEFAULT_MAP_CONFIG.center}>
            <Popup>
              <div className="map-popup map-popup--base">
                <h3>🔥 Ognisko / Baza</h3>
              </div>
            </Popup>
          </Marker>

          {/* Player markers */}
          {positions.map((pos) => {
            const playerName = pos.players?.name || 'Nieznany';
            const klanName = pos.players?.klans?.name || 'Bez klanu';
            const klanColor = getKlanColor(pos.players?.klan_id);

            const avatarUrl = pos.players?.avatar_url || null;
            const playerIcon = L.divIcon({
              className: 'admin-player-marker',
              html: avatarUrl
                ? `
                  <div style="
                    width: 28px;
                    height: 28px;
                    border: 2px solid #fff;
                    border-radius: 50%;
                    overflow: hidden;
                    box-shadow: 0 0 8px ${klanColor};
                  ">
                    <img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" />
                  </div>
                `
                : `
                  <div style="
                    width: 20px;
                    height: 20px;
                    background: ${klanColor};
                    border: 2px solid #fff;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 8px;
                    color: #fff;
                    box-shadow: 0 0 8px ${klanColor};
                  ">
                    ${playerName.charAt(0).toUpperCase()}
                  </div>
                `,
              iconSize: avatarUrl ? [28, 28] : [20, 20],
              iconAnchor: avatarUrl ? [14, 14] : [10, 10],
            });

            return (
              <Marker
                key={pos.player_id}
                position={[pos.lat, pos.lng]}
                icon={playerIcon}
              >
                <Popup>
                  <div className="admin-map-popup">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {avatarUrl && (
                        <img
                          src={avatarUrl}
                          alt={playerName}
                          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${klanColor}` }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      <h3 style={{ margin: 0, color: klanColor }}>{playerName}</h3>
                    </div>
                    <p><strong>Klan:</strong> {klanName}</p>
                    <p><strong>Pozycja:</strong> {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</p>
                    <p><strong>Dokładność:</strong> ±{Math.round(pos.accuracy || 0)}m</p>
                    <p><strong>Online:</strong> {new Date(pos.updated_at).toLocaleTimeString()}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* God markers */}
          {godPositions.map((godPos) => {
            const godName = godPos.gods?.name || 'Bóg';
            const klanName = godPos.gods?.klans?.name || '';
            const klanColor = godPos.gods?.klans?.theme_color || '#FFD700';

            const godIconUrl = GOD_ICONS[godName] || '';

            const godIcon = L.divIcon({
              className: 'admin-god-marker',
              html: godIconUrl ? `
                <div style="
                  width: 36px;
                  height: 36px;
                  border: 3px solid ${klanColor};
                  border-radius: 50%;
                  overflow: hidden;
                  box-shadow: 0 0 12px ${klanColor}, 0 0 24px ${klanColor};
                ">
                  <img src="${godIconUrl}" alt="${godName}" style="width:100%;height:100%;object-fit:cover;" />
                </div>
              ` : `
                <div style="
                  width: 36px;
                  height: 36px;
                  background: ${klanColor};
                  border: 3px solid #FFD700;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 14px;
                  color: #fff;
                  box-shadow: 0 0 12px ${klanColor}, 0 0 24px #FFD700;
                  text-shadow: 0 0 4px rgba(0,0,0,0.8);
                ">
                  ✦
                </div>
              `,
              iconSize: [36, 36],
              iconAnchor: [18, 18],
            });

            return (
              <Marker
                key={godPos.god_id}
                position={[godPos.lat, godPos.lng]}
                icon={godIcon}
              >
                <Popup>
                  <div className="admin-map-popup admin-map-popup--god">
                    <h3 style={{ margin: 0, color: klanColor }}>{godIconUrl ? <img src={godIconUrl} alt={godName} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', marginRight: 4, verticalAlign: 'middle' }} /> : '✨ '}{godName}</h3>
                    {klanName && <p><strong>Klan:</strong> {klanName}</p>}
                    <p><strong>Pozycja:</strong> {godPos.lat.toFixed(5)}, {godPos.lng.toFixed(5)}</p>
                    <p><strong>Dokładność:</strong> ±{Math.round(godPos.accuracy || 0)}m</p>
                    <p><strong>Online:</strong> {new Date(godPos.updated_at).toLocaleTimeString()}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="admin-map-panel__legend">
        <div className="admin-map-panel__legend-section">
          <strong>Gracze:</strong>
          {klans.map((klan) => (
            <div key={klan.id} className="admin-map-panel__legend-item">
              <span
                className="admin-map-panel__legend-color"
                style={{ background: klan.theme_color }}
              />
              <span>{klan.name}</span>
            </div>
          ))}
        </div>
        {godPositions.length > 0 && (
          <div className="admin-map-panel__legend-section">
            <strong>Bogowie:</strong>
            {godPositions.map((godPos) => {
              const klanColor = godPos.gods?.klans?.theme_color || '#FFD700';
              const godName = godPos.gods?.name || 'Bóg';
              const godIconUrl = GOD_ICONS[godName] || '';
              return (
                <div key={godPos.god_id} className="admin-map-panel__legend-item">
                  <span
                    className="admin-map-panel__legend-color admin-map-panel__legend-color--god"
                    style={{ background: klanColor }}
                  />
                  <span>{godIconUrl ? <img src={godIconUrl} alt={godName} style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', marginRight: 4, verticalAlign: 'middle' }} /> : '✨ '}{godName}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
