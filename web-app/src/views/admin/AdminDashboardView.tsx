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

  const generatePreview = async () => {
    if (!inputText.trim()) return;

    setIsGeneratingPreview(true);
    setPreviewAudio(null);

    try {
      const response = await fetch(
        'https://xmanqwjuqylwhizkqjsi.supabase.co/functions/v1/generate-tts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: inputText,
            voice_id: selectedVoice,
          }),
        }
      );

      const data = await response.json();
      if (data.audio_url) {
        setPreviewAudio(data.audio_url);
        if (audioPreviewRef.current) {
          audioPreviewRef.current.pause();
        }
        const audio = new Audio(data.audio_url);
        audioPreviewRef.current = audio;
        audio.play();
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Błąd generowania podglądu audio. Sprawdź konsolę.');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    if (broadcastToAll) {
      await supabase.from('messages').insert({
        content: inputText,
        sender: 'god',
        game_id: selectedGameId,
        klan_id: null,
        tts_requested: ttsEnabled,
        audio_url: ttsEnabled ? previewAudio : null,
      });
    } else {
      await supabase.from('messages').insert({
        content: inputText,
        sender: 'god',
        game_id: selectedGameId,
        klan_id: selectedKlanId,
        tts_requested: ttsEnabled,
        audio_url: ttsEnabled ? previewAudio : null,
      });
    }

    setInputText('');
    setPreviewAudio(null);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
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
            <option value="">Wszystkie klany</option>
            {klans
              .filter((k) => k.game_id === selectedGameId)
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
          </select>
        </div>
        {selectedKlan && (
          <p className="admin-panel__info">
            👁️ Przemawiasz jako Bogowie do klanu <strong>{selectedKlan.name}</strong>
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
          {selectedKlan ? `💬 Czat: ${selectedKlan.name}` : '💬 Czat wszystkich klanów'}
        </h2>
        <div className="admin-chat__messages">
          {messages.length === 0 && (
            <p className="admin-panel__empty">Brak wiadomości</p>
          )}
          {messages.map((msg) => {
            const klan = klans.find((k) => k.id === msg.klan_id);
            const isBroadcast = msg.sender === 'god' && msg.klan_id === null;
            return (
              <div
                key={msg.id}
                className={`admin-chat__message ${msg.sender === 'god' ? 'admin-chat__message--god' : ''} ${isBroadcast ? 'admin-chat__message--broadcast' : ''}`}
              >
                <span className="admin-chat__message-sender">
                  {isBroadcast
                    ? '📢 Broadcast'
                    : msg.sender === 'god'
                      ? `✨ Bogowie${klan ? ` → ${klan.name}` : ''}`
                      : `👤 ${msg.sender} (${klan?.name || '?'})`}
                  {msg.tts_requested && ' 🔊'}
                  {msg.audio_url && ' ▶'}
                </span>
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
                ? 'Wiadomość do wszystkich klanów...'
                : selectedKlan
                  ? `Wiadomość od Bogów do ${selectedKlan.name}...`
                  : 'Wybierz klan lub włącz wysyłanie do wszystkich...'
            }
            className="admin-chat__input"
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage} className="button-glow">
            Wyślij
          </button>
        </div>
        <label className="admin-chat__broadcast">
          <input
            type="checkbox"
            checked={broadcastToAll}
            onChange={(e) => setBroadcastToAll(e.target.checked)}
          />
          📢 Wyślij do wszystkich klanów
        </label>
      </div>
    </div>
  );
}
