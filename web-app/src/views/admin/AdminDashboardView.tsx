import { useState, useEffect, useRef } from 'react';
import { useAdminAuth } from '../../lib/admin/AdminAuth';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database.types';

type Game = Database['public']['Tables']['games']['Row'];
type Klan = Database['public']['Tables']['klans']['Row'];
type Player = Database['public']['Tables']['players']['Row'];

export function AdminDashboardView() {
  const { logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'games' | 'klans' | 'players' | 'chat'>('games');
  const [games, setGames] = useState<Game[]>([]);
  const [klans, setKlans] = useState<Klan[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadKlans(selectedGameId);
    }
  }, [selectedGameId]);

  const loadGames = async () => {
    const { data } = await supabase.from('games').select('*').order('created_at', { ascending: false });
    if (data) {
      setGames(data);
      if (data.length > 0 && !selectedGameId) {
        setSelectedGameId(data[0].id);
      }
    }
  };

  const loadKlans = async (gameId: string) => {
    const { data } = await supabase.from('klans').select('*').eq('game_id', gameId);
    if (data) setKlans(data);
  };

  const loadPlayers = async () => {
    const { data } = await supabase.from('players').select('*').order('created_at', { ascending: false });
    if (data) setPlayers(data);
  };

  useEffect(() => {
    loadGames();
    loadPlayers();
  }, []);

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
          />
        )}
        {activeTab === 'klans' && (
          <KlansPanel klans={klans} gameId={selectedGameId} />
        )}
        {activeTab === 'players' && (
          <PlayersPanel players={players} klans={klans} gameId={selectedGameId} />
        )}
        {activeTab === 'chat' && (
          <ChatPanel games={games} klans={klans} />
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
          className={`admin-tabs__item ${activeTab === 'chat' ? 'admin-tabs__item--active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          ✨ Głos Bogów
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
}: {
  games: Game[];
  selectedGameId: string | null;
  onSelectGame: (id: string) => void;
  onCreateGame: (name: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onDeleteGame: (id: string) => void;
  loading: boolean;
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
    });
    setPlayerName('');
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

type Message = Database['public']['Tables']['messages']['Row'];

const TTS_VOICES = [
  { id: 'Kamil_Voice', name: 'Bogini Głos (Kamil)', voiceId: 'rpg9PEuAEDV7I1OjYrbj' },
  { id: 'Tomek_Voice', name: 'Mroczny Wizard (Tomek)', voiceId: 'PLACEHOLDER_TOMEK' },
  { id: 'Kinga_Voice', name: 'Leśna Driada (Kinga)', voiceId: 'PLACEHOLDER_KINGA' },
];

function ChatPanel({ games, klans }: { games: Game[]; klans: Klan[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedKlanId, setSelectedKlanId] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [broadcastToAll, setBroadcastToAll] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(TTS_VOICES[0].voiceId);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const audioPlayersRef = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    if (games.length > 0 && !selectedGameId) {
      setSelectedGameId(games.find((g) => g.status === 'active')?.id || games[0].id);
    }
  }, [games]);

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
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
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
      .order('created_at', { ascending: true })
      .limit(50);

    if (selectedGameId) {
      query = query.eq('game_id', selectedGameId);
    }
    if (selectedKlanId) {
      query = query.eq('klan_id', selectedKlanId);
    } else {
      query = query.is('klan_id', null);
    }

    const { data } = await query;
    if (data) setMessages(data);
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

  const generatePreview = async () => {
    if (!inputText.trim()) return;

    setIsGeneratingPreview(true);
    setPreviewAudio(null);

    const audioUrl = await generateTTS(inputText, selectedVoice);
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
    if (!inputText.trim()) return;

    let audioUrl: string | null = previewAudio;

    if (ttsEnabled && !audioUrl) {
      setIsGeneratingPreview(true);
      audioUrl = await generateTTS(inputText, selectedVoice);
      setIsGeneratingPreview(false);
    }

    if (broadcastToAll) {
      await supabase.from('messages').insert({
        content: inputText,
        sender: 'god',
        game_id: selectedGameId,
        klan_id: null,
        tts_requested: ttsEnabled,
        audio_url: audioUrl,
      });
    } else {
      await supabase.from('messages').insert({
        content: inputText,
        sender: 'god',
        game_id: selectedGameId,
        klan_id: selectedKlanId,
        tts_requested: ttsEnabled,
        audio_url: audioUrl,
      });
    }

    setInputText('');
    setPreviewAudio(null);
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

  return (
    <div className="admin-panel">
      <div className="admin-panel__section">
        <h2 className="admin-panel__title">📨 Czat Klanu</h2>
        <div className="admin-panel__row">
          <select
            value={selectedGameId || ''}
            onChange={(e) => {
              setSelectedGameId(e.target.value || null);
              setSelectedKlanId(null);
            }}
            className="admin-panel__select"
          >
            <option value="">Wszystkie gry</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={selectedKlanId || ''}
            onChange={(e) => setSelectedKlanId(e.target.value || null)}
            className="admin-panel__select"
          >
            <option value="">Publiczny</option>
            {klans
              .filter((k) => k.game_id === selectedGameId)
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
          </select>
        </div>
        {selectedKlan ? (
          <p className="admin-panel__info">
            👁️ Przemawiasz jako Bogowie do klanu <strong>{selectedKlan.name}</strong>
          </p>
        ) : selectedKlanId === null && (
          <p className="admin-panel__info">
            🌍 Przemawiasz jako Bogowie na kanale <strong>Publicznym</strong>
          </p>
        )}
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
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="admin-panel__select"
            >
              {TTS_VOICES.map((voice) => (
                <option key={voice.id} value={voice.voiceId}>
                  {voice.name}
                </option>
              ))}
            </select>
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
            const klan = klans.find((k) => k.id === msg.klan_id);
            const isBroadcast = msg.sender === 'god' && msg.klan_id === null;
            const isPlaying = audioPlayersRef.current[msg.id] && !audioPlayersRef.current[msg.id].paused;
            const klanColor = klan?.theme_color;
            const isSelectedKlan = selectedKlanId && msg.klan_id === selectedKlanId;
            return (
              <div
                key={msg.id}
                className={`admin-chat__message ${msg.sender === 'god' ? 'admin-chat__message--god' : ''} ${isBroadcast ? 'admin-chat__message--broadcast' : ''} ${isSelectedKlan ? 'admin-chat__message--selected-klan' : ''}`}
                style={klanColor && !isBroadcast ? { borderLeft: `4px solid ${klanColor}` } : undefined}
              >
                <div className="admin-chat__message-header">
                  <span className="admin-chat__message-sender">
                    {isBroadcast
                      ? '📢 Broadcast'
                      : msg.sender === 'god'
                        ? `✨ Bogowie${klan ? ` → ${klan.name}` : ''}`
                        : `👤 ${msg.sender} (${klan?.name || '?'})`}
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
                    {msg.sender === 'god' && (
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
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        <div className="admin-chat__input-row">
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
            disabled={!inputText.trim() || isGeneratingPreview}
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
    </div>
  );
}
