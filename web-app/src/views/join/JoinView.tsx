import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { setPlayerSession, getPlayerSession, clearPlayerSession } from '../../lib/playerSession';
import { transformPhoto } from '../../lib/geminiTransform';
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingAvatar, setExistingAvatar] = useState<string | null>(null);
  const [playerAvatarUrl, setPlayerAvatarUrl] = useState<string | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const resetPhotoState = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setExistingAvatar(null);
    setPlayerAvatarUrl(null);
  };

  const handleSelectPlayer = async (playerId: string) => {
    setSelectedPlayerId(playerId);
    const player = players.find(p => p.id === playerId);
    setCustomName(player?.name || '');
    resetPhotoState();

    if (!player) return;

    const { data } = await supabase
      .from('players')
      .select('avatar_url')
      .eq('id', playerId)
      .single();

    if (data?.avatar_url) {
      setExistingAvatar(data.avatar_url);
      setPlayerAvatarUrl(data.avatar_url);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const maxDim = 1024;
      let w = img.width;
      let h = img.height;

      if (w > h && w > maxDim) { h = (h * maxDim) / w; w = maxDim; }
      else if (h > maxDim) { w = (w * maxDim) / h; h = maxDim; }

      canvas.width = w;
      canvas.height = h;
      ctx?.drawImage(img, 0, 0, w, h);

      const compressed = canvas.toDataURL('image/jpeg', 0.7);
      setPhotoPreview(compressed);
    };

    img.src = objectUrl;
  };

  const handleRegenerate = () => {
    setExistingAvatar(null);
    setPlayerAvatarUrl(null);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleJoin = async () => {
    if (!selectedPlayerId) return;

    const player = players.find(p => p.id === selectedPlayerId);
    if (!player) return;

    const finalName = customName.trim() || player.name;
    const klan = klans.find(k => k.id === player.klan_id);

    let avatarUrl = playerAvatarUrl;

    if (!avatarUrl && photoFile) {
      setIsTransforming(true);

      try {
        const fileName = `${selectedPlayerId}_${Date.now()}.jpg`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('player-avatars')
          .upload(filePath, photoFile, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          console.error('[JoinView] Upload error:', uploadError);
          setError('Błąd podczas zapisywania zdjęcia. Spróbuj ponownie.');
          setIsTransforming(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('player-avatars')
          .getPublicUrl(filePath);

        const originalUrl = urlData.publicUrl;

        const clanName = klan?.name || '';

        if (clanName && photoPreview) {
          const base64Data = photoPreview.split(',')[1];

          const transformedBase64 = await transformPhoto(base64Data, clanName);

          if (transformedBase64) {
            const transformedPath = `${selectedPlayerId}_avatar.png`;
            const binaryData = Uint8Array.from(atob(transformedBase64), (c) =>
              c.charCodeAt(0)
            );

            const { error: avatarUploadError } = await supabase.storage
              .from('player-avatars')
              .upload(transformedPath, binaryData, {
                contentType: 'image/png',
                upsert: true,
              });

            if (!avatarUploadError) {
              const { data: avatarUrlData } = supabase.storage
                .from('player-avatars')
                .getPublicUrl(transformedPath);
              avatarUrl = avatarUrlData.publicUrl;
            }
          }
        }

        if (!avatarUrl) {
          avatarUrl = originalUrl;
        }
      } catch (err) {
        console.error('[JoinView] Transform error:', err);
      }

      setIsTransforming(false);
    }

    const { error: updateError } = await supabase
      .from('players')
      .update({
        name: finalName,
        joined_at: new Date().toISOString(),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      })
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
      avatar_url: avatarUrl || null,
      game_id: selectedGameId || '',
    });

    window.location.href = '/intro';
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
                          onClick={() => handleSelectPlayer(player.id)}
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
                          onClick={() => handleSelectPlayer(player.id)}
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

              {existingAvatar ? (
                <div className="join-photo">
                  <label className="join-panel__label">Twój awatar (kliknij by wygenerować nowy):</label>
                  <div
                    className="join-photo__existing join-photo__existing--interactive"
                    style={{ borderColor: getKlanColor(selectedPlayer.klan_id) }}
                    onClick={handleRegenerate}
                    title="Kliknij by Bogowie nadali Ci nowe oblicze"
                  >
                    <img
                      src={existingAvatar}
                      alt="Twój awatar"
                      className="join-photo__preview"
                    />
                    <div className="join-photo__regenerate-overlay">
                      <span>🔄</span>
                    </div>
                  </div>
                  <p className="join-photo__hint">
                    Kliknij awatar by wygenerować nowy
                  </p>
                </div>
              ) : (
                <div className="join-photo">
                  <label className="join-panel__label">📸 Zdjęcie profilowe (wymagane):</label>

                  {photoPreview ? (
                    <div
                      className="join-photo__existing"
                      style={{ borderColor: getKlanColor(selectedPlayer.klan_id) }}
                    >
                      <img
                        src={photoPreview}
                        alt="Podgląd zdjęcia"
                        className="join-photo__preview"
                      />
                    </div>
                  ) : (
                    <button
                      className="join-photo__capture"
                      style={{ borderColor: getKlanColor(selectedPlayer.klan_id) }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span className="join-photo__capture-icon">📷</span>
                      <span>Zrób zdjęcie</span>
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    capture="user"
                    accept="image/*"
                    onChange={handlePhotoCapture}
                    style={{ display: 'none' }}
                  />

                  {photoPreview && (
                    <p className="join-photo__hint">
                      Bogowie użyczą Ci nowego oblicza...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            className="button-glow join-panel__submit"
            onClick={handleJoin}
            disabled={!selectedPlayerId || isTransforming || (!existingAvatar && !photoFile)}
          >
            {isTransforming ? '⚡ Bogowie nadają Ci oblicze...' : 'Dołącz do gry'}
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