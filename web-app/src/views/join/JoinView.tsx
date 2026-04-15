import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { setPlayerSession, getPlayerSession } from '../../lib/playerSession';
import type { Database } from '../../types/database.types';
import './JoinView.css';

type Player = Database['public']['Tables']['players']['Row'];
type Klan = Database['public']['Tables']['klans']['Row'];

export function JoinView() {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [klans, setKlans] = useState<Klan[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Check if already logged in - redirect if has session
  useEffect(() => {
    const session = getPlayerSession();
    if (session) {
      window.location.href = '/';
    }
  }, []);

  useEffect(() => {
    // Check for game parameter in URL - it's required
    // URL format: http://localhost:5173/join?game=UUID
    const params = new URLSearchParams(window.location.search);
    const gameParam = params.get('game');
    
    if (!gameParam) {
      setError('Brak parametru gry. Użyj linku zaproszenia od Mistrza Gry.');
      return;
    }
    
    loadGameById(gameParam);
  }, []);

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

  const handleJoin = async () => {
    if (!selectedPlayerId) return;
    
    const player = players.find(p => p.id === selectedPlayerId);
    if (!player) return;

    const finalName = customName.trim() || player.name;
    const klan = klans.find(k => k.id === player.klan_id);

    // Update player name and set joined_at
    const { error: updateError } = await supabase
      .from('players')
      .update({ name: finalName, joined_at: new Date().toISOString() })
      .eq('id', selectedPlayerId);

    if (updateError) {
      setError('Błąd podczas zapisywania. Spróbuj ponownie.');
      return;
    }

    // Save session
    setPlayerSession({
      id: player.id,
      name: finalName,
      klan_id: player.klan_id || '',
      klan_name: klan?.name || 'Nieznany',
      klan_color: klan?.theme_color || '#888',
      game_id: selectedGameId || '',
    });

    // Navigate to home to show the app with new session
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
      </header>

      <main className="view__content">
        {error ? (
          <div className="join-error">
            <div className="join-error__icon">⚠️</div>
            <p className="join-error__message">{error}</p>
          </div>
        ) : !selectedGameId ? (
          <div className="join-loading">Ładowanie...</div>
        ) : (
        <div className="join-panel">
          <div className="join-panel__section">
            <label className="join-panel__label">Dostępni gracze:</label>
            <div className="join-panel__players">
              {availablePlayers.length === 0 && (
                <p className="join-panel__empty">Brak dostępnych graczy</p>
              )}
              {availablePlayers.map((player) => {
                const klan = klans.find(k => k.id === player.klan_id);
                return (
                  <button
                    key={player.id}
                    className={`join-player-card ${selectedPlayerId === player.id ? 'join-player-card--selected' : ''}`}
                    onClick={() => {
                      setSelectedPlayerId(player.id);
                      setCustomName(player.name);
                    }}
                  >
                    <span 
                      className="join-player-card__color"
                      style={{ backgroundColor: klan?.theme_color || '#888' }}
                    />
                    <span className="join-player-card__name">{player.name}</span>
                    <span className="join-player-card__klan">{klan?.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

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
        </div>
        )}
      </main>
    </div>
  );
}