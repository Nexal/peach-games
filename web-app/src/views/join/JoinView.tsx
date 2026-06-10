import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { setPlayerSession, getPlayerSession, clearPlayerSession } from '../../lib/playerSession';
import type { Database } from '../../types/database.types';
import './JoinView.css';

type Player = Database['public']['Tables']['players']['Row'];
type Klan = Database['public']['Tables']['klans']['Row'];
type Game = Database['public']['Tables']['games']['Row'];

export function JoinView() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [klans, setKlans] = useState<Klan[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    const checkAutoLogin = async () => {
      const stored = getPlayerSession();
      if (!stored?.id || !stored?.game_id) return;

      const params = new URLSearchParams(window.location.search);
      const gameParam = params.get('game');

      if (gameParam && stored.game_id !== gameParam) return;

      const { data: player } = await supabase
        .from('players')
        .select('id, name, klan_id, joined_at, klans(id, name, theme_color)')
        .eq('id', stored.id)
        .single();

      if (player?.joined_at) {
        setPlayerSession({
          id: player.id,
          name: player.name,
          klan_id: player.klan_id || '',
          klan_name: (player.klans as any)?.name || 'Nieznany',
          klan_color: (player.klans as any)?.theme_color || '#888',
          game_id: stored.game_id,
        });
        window.location.href = '/';
      } else {
        clearPlayerSession();
      }
    };

    checkAutoLogin();
  }, []);

  useEffect(() => {
    // Check for game parameter in URL - required for normal flow
    // But also check if we should show dev mode (no game param)
    const params = new URLSearchParams(window.location.search);
    const gameParam = params.get('game');
    const devParam = params.get('dev');

    if (devParam === 'true') {
      setIsDevMode(true);
      loadAllGames();
    } else if (!gameParam) {
      setError('Brak parametru gry. Użyj linku zaproszenia od Mistrza Gry.');
      return;
    } else {
      loadGameById(gameParam);
    }
  }, []);

  const loadAllGames = async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setGames(data);
  };

  const loadGameById = async (gameId: string) => {
    setError(null);
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !gameData) {
      setError('Gra nie została znaleziona. Sprawdź link zaproszenia.');
      return;
    }

    setSelectedGameId(gameId);
  };

  useEffect(() => {
    if (selectedGameId) {
      loadGameData(selectedGameId);
    }
  }, [selectedGameId]);

  const loadGameData = async (gameId: string) => {
    const [playersRes, klansRes] = await Promise.all([
      supabase.from('players').select('*').eq('game_id', gameId),
      supabase.from('klans').select('*').eq('game_id', gameId),
    ]);
    if (playersRes.data) setPlayers(playersRes.data);
    if (klansRes.data) setKlans(klansRes.data);
  };

  const availablePlayers = players.filter(p => !p.joined_at);
  const joinedPlayers = players.filter(p => p.joined_at);

  const handleJoin = async () => {
    if (!selectedPlayerId) return;

    const player = players.find(p => p.id === selectedPlayerId);
    if (!player) return;

    const finalName = customName.trim() || player.name;
    const klan = klans.find(k => k.id === player.klan_id);

    const { error: updateError } = await supabase
      .from('players')
      .update({ name: finalName, joined_at: new Date().toISOString() })
      .eq('id', selectedPlayerId);

    if (updateError) {
      setError('Błąd podczas zapisywania. Spróbuj ponownie.');
      return;
    }

    setPlayerSession({
      id: player.id,
      name: finalName,
      klan_id: player.klan_id || '',
      klan_name: klan?.name || 'Nieznany',
      klan_color: klan?.theme_color || '#888',
      game_id: selectedGameId || '',
    });

    window.location.href = '/';
  };

  const getKlanColor = (klanId: string | null) => {
    if (!klanId) return '#888';
    const klan = klans.find(k => k.id === klanId);
    return klan?.theme_color || '#888';
  };

  const getKlanName = (klanId: string | null) => {
    if (!klanId) return 'Nieznany';
    const klan = klans.find(k => k.id === klanId);
    return klan?.name || 'Nieznany';
  };

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  return (
    <div className="view view--join">
      <header className="view__header">
        <img src="/icons/glos-bogow.png" alt="PeachGames" className="view__logo" />
        <h1 className="view__title">Dołącz do gry</h1>
        {isDevMode && <span className="join-dev-badge">🧪 Tryb testowy</span>}
      </header>

      <main className="view__content">
        {error ? (
          <div className="join-error">
            <div className="join-error__icon">⚠️</div>
            <p className="join-error__message">{error}</p>
          </div>
        ) : (
        <div className="join-panel">
          {/* Dev mode: Select game from list */}
          {isDevMode && !selectedGameId && games.length > 0 && (
            <div className="join-panel__section">
              <label className="join-panel__label">Wybierz grę:</label>
              <div className="join-panel__players">
                {games.map((game) => (
                  <button
                    key={game.id}
                    className="join-player-card"
                    onClick={() => loadGameById(game.id)}
                  >
                    <span className="join-player-card__name">{game.name}</span>
                    <span className="join-player-card__klan">Status: {game.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Select from available players */}
          {selectedGameId && (
            <>
              {availablePlayers.length > 0 && (
                <div className="join-panel__section">
                  <label className="join-panel__label">Dostępni gracze:</label>
                  <div className="join-panel__players">
                    {availablePlayers.map((player) => {
                      const klan = klans.find(k => k.id === player.klan_id);
                      return (
                        <button
                          key={player.id}
                          className={`join-player-card ${selectedPlayerId === player.id ? 'join-player-card--selected' : ''}`}
                          onClick={() => {
                            setSelectedPlayerId(player.id);
                            setCustomName(player.name || '');
                          }}
                        >
                          <span
                            className="join-player-card__color"
                            style={{ backgroundColor: klan?.theme_color || '#888' }}
                          />
                          <span className="join-player-card__name">{player.name || '(bez imienia)'}</span>
                          <span className="join-player-card__klan">{klan?.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Also show already joined players for testing */}
              {joinedPlayers.length > 0 && (
                <div className="join-panel__section">
                  <label className="join-panel__label">Zalogowani gracze (kliknij by przejąć):</label>
                  <div className="join-panel__players">
                    {joinedPlayers.map((player) => {
                      const klan = klans.find(k => k.id === player.klan_id);
                      return (
                        <button
                          key={player.id}
                          className={`join-player-card join-player-card--joined ${selectedPlayerId === player.id ? 'join-player-card--selected' : ''}`}
                          onClick={() => {
                            setSelectedPlayerId(player.id);
                            setCustomName(player.name || '');
                          }}
                        >
                          <span
                            className="join-player-card__color"
                            style={{ backgroundColor: klan?.theme_color || '#888' }}
                          />
                          <span className="join-player-card__name">{player.name || '(bez imienia)'}</span>
                          <span className="join-player-card__klan">{klan?.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {selectedPlayer && (
            <div className="join-panel__section">
              <label className="join-panel__label">Twój pseudonim:</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Wpisz imię..."
                className="join-panel__input"
              />

              <div className="join-panel__preview">
                <span className="join-panel__preview-label">Twój Klan:</span>
                <div
                  className="join-panel__preview-klan"
                  style={{ borderColor: getKlanColor(selectedPlayer.klan_id) }}
                >
                  <span
                    className="join-panel__preview-color"
                    style={{ backgroundColor: getKlanColor(selectedPlayer.klan_id) }}
                  />
                  <span>{getKlanName(selectedPlayer.klan_id)}</span>
                </div>
              </div>
            </div>
          )}

          <button
            className="button-glow join-panel__submit"
            onClick={handleJoin}
            disabled={!selectedPlayerId}
          >
            Dołącz do gry
          </button>

          {isDevMode && selectedGameId && (
            <button
              className="join-panel__back"
              onClick={() => {
                setSelectedGameId(null);
                setSelectedPlayerId(null);
              }}
            >
              ← Wybierz inną grę
            </button>
          )}
        </div>
        )}
      </main>
    </div>
  );
}