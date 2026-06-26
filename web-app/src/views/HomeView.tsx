import { useState, useRef, useEffect } from 'react';
import { setPlayerSession, clearPlayerSession } from '../lib/playerSession';
import { useGame, usePlayerSession } from '../App';
import { supabase } from '../lib/supabase';
import { transformPhoto } from '../lib/geminiTransform';
import type { GameStatus } from '../hooks/useGameStatus';
import { CLAN_INTRO_LIST, getClanIntroIcon } from '../lib/clanIntros';
import './HomeView.css';
import { ClanLeaderboardView } from './ClanLeaderboardView';

const CLAN_ICONS: Record<string, { emoji: string; image?: string }> = {
  'klan peruna': { emoji: '⚡', image: '/icons/perun_symbol-Photoroom.png' },
  'klan welesa': { emoji: '🐺', image: '/icons/weles_icon_symbol-Photoroom.png' },
  'klan mokoszy': { emoji: '🌿', image: '/icons/mokosz_symbol-Photoroom.png' },
};

const GOD_AVATAR_IMAGES: Record<string, string> = {
  'Perun': '/icons/perun_avatar.png',
  'Weles': '/icons/weles_avatar.jpeg',
  'Mokosz': '/icons/mokosz_avatar.jpeg',
};

function getClanIcon(klanName: string): { emoji: string; image?: string } {
  const key = klanName.toLowerCase();
  return CLAN_ICONS[key] || { emoji: '⚔️' };
}

function getGodAvatar(klanName: string): string {
  const godNames: Record<string, string> = {
    'klan peruna': 'Perun',
    'klan welesa': 'Weles',
    'klan mokoszy': 'Mokosz',
  };
  const godName = godNames[klanName.toLowerCase()] || '';
  return GOD_AVATAR_IMAGES[godName] || '';
}

export function HomeView() {
  const { session, refreshSession, gameStatus } = usePlayerSession();
  const { klanPoints } = useGame();
  const [logoEnlarged, setLogoEnlarged] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [transformedAvatar, setTransformedAvatar] = useState<string | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editName, setEditName] = useState(session?.name || '');
  const [nameSaved, setNameSaved] = useState(false);
  const [enlargedAvatar, setEnlargedAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeEffects, setActiveEffects] = useState<{
    id: string;
    name: string;
    icon: string;
    type: string;
    activatedAt: string;
    durationSeconds: number;
  }[]>([]);
  const [effectNow, setEffectNow] = useState(0);

  useEffect(() => {
    setEffectNow(Date.now());
    const interval = setInterval(() => setEffectNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const clanIcon = session ? getClanIcon(session.klan_name) : { emoji: '⚔️' };
  const godAvatarUrl = session ? getGodAvatar(session.klan_name) : '';

  useEffect(() => {
    if (!session?.klan_id || !session?.game_id) return;

    const loadEffects = () => {
      Promise.all([
        supabase
          .from('clan_items')
          .select('id, name, type, effect, duration_seconds, activated_at, active, klan_id')
          .eq('klan_id', session.klan_id)
          .eq('game_id', session.game_id)
          .eq('active', true),
        supabase
          .from('clan_items')
          .select('id, name, type, effect, duration_seconds, activated_at, active, klan_id')
          .eq('target_klan_id', session.klan_id)
          .eq('game_id', session.game_id)
          .eq('active', true),
      ]).then(([{ data: ownData }, { data: curseData }]) => {
        const now = Date.now();
        const allItems = [...(ownData || []), ...(curseData || [])];
        const effects = allItems
          .map((item) => {
            if (!item.activated_at || !item.duration_seconds) return null;
            const expiresAt = new Date(item.activated_at).getTime() + item.duration_seconds * 1000;
            if (expiresAt <= now) return null;
            const effect = item.effect as Record<string, unknown>;
            const isCurse = item.type === 'curse' && item.klan_id !== session.klan_id;
            let icon = isCurse ? '💀' : item.type === 'curse' ? '💀' : '⚡';
            if (effect?.type === 'points_multiplier') icon = '⚡';
            else if (effect?.type === 'points_divider') icon = '💀';
            else if (effect?.type === 'curse_immunity') icon = '🛡️';
            else if (effect?.type === 'hide_markers') icon = '🌫️';
            else if (effect?.type === 'chaos_markers') icon = '🌀';
            else if (effect?.type === 'reveal_hidden_quests') icon = '🔮';
            return { id: item.id, name: item.name, icon, type: item.type, activatedAt: item.activated_at, durationSeconds: item.duration_seconds };
          })
          .filter(Boolean);
        setActiveEffects(effects as typeof activeEffects);
      });
    };

    loadEffects();

    const channel = supabase
      .channel('home-active-effects')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'clan_items', filter: `klan_id=eq.${session.klan_id}` },
        () => loadEffects(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clan_items', filter: `klan_id=eq.${session.klan_id}` },
        () => loadEffects(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'clan_items', filter: `target_klan_id=eq.${session.klan_id}` },
        () => loadEffects(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clan_items', filter: `target_klan_id=eq.${session.klan_id}` },
        () => loadEffects(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.klan_id, session?.game_id]);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setError(null);
  };

  const handleGenerateNewAvatar = async () => {
    if (!session || !photoFile) return;

    setIsTransforming(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const objectUrl = URL.createObjectURL(photoFile);

      await new Promise<void>((resolve) => {
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

          resolve();
        };
        img.src = objectUrl;
      });

      const photoPreview = canvas.toDataURL('image/jpeg', 0.7);

      const fileName = `${session.id}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('player-avatars')
        .upload(fileName, photoFile, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('[HomeView] Upload error:', uploadError);
        setError('Błąd podczas zapisywania zdjęcia.');
        setIsTransforming(false);
        return;
      }

      const base64Data = photoPreview.split(',')[1];
      const transformedBase64 = await transformPhoto(base64Data, session.klan_name);

      if (transformedBase64) {
        setTransformedAvatar(`data:image/png;base64,${transformedBase64}`);
      } else {
        setTransformedAvatar(photoPreview);
      }
    } catch (err) {
      console.error('[HomeView] Transform error:', err);
      setError('Błąd podczas generowania awatara.');
    }

    setIsTransforming(false);
  };

  const handleSaveNewAvatar = async () => {
    if (!session || !transformedAvatar) return;
    setIsSaving(true);
    setError(null);

    try {
      const isBase64 = transformedAvatar.startsWith('data:');
      let avatarUrl: string;

      if (isBase64) {
        const base64 = transformedAvatar.split(',')[1];
        const mimeMatch = transformedAvatar.match(/^data:(image\/\w+);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const ext = mime === 'image/jpeg' ? 'jpg' : 'png';
        const binaryData = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

        const ts = Date.now();
        const transformedPath = `${session.id}_avatar_${ts}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('player-avatars')
          .upload(transformedPath, binaryData, {
            contentType: mime,
          });

        if (uploadError) {
          console.error('[HomeView] Avatar upload error:', uploadError);
          setError('Błąd podczas zapisywania awatara.');
          setIsSaving(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('player-avatars')
          .getPublicUrl(transformedPath);
        avatarUrl = urlData.publicUrl;
      } else {
        avatarUrl = transformedAvatar;
      }

      const { error: updateError } = await supabase
        .from('players')
        .update({ avatar_url: avatarUrl })
        .eq('id', session.id);

      if (updateError) {
        console.error('[HomeView] DB update error:', updateError);
        setError('Błąd podczas zapisywania awatara.');
        setIsSaving(false);
        return;
      }

      setPlayerSession({ ...session, avatar_url: avatarUrl });
      refreshSession();
      closeModal();
    } catch (err) {
      console.error('[HomeView] Save error:', err);
      setError('Błąd podczas zapisywania.');
    }

    setIsSaving(false);
  };

  const handleSaveName = async () => {
    if (!session || !editName.trim()) return;
    setError(null);

    const { error: updateError } = await supabase
      .from('players')
      .update({ name: editName.trim() })
      .eq('id', session.id);

    if (updateError) {
      console.error('[HomeView] Name update error:', updateError);
      setError('Błąd podczas zapisywania nazwy.');
      return;
    }

    setPlayerSession({ ...session, name: editName.trim() });
    refreshSession();
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const handleLogout = () => {
    clearPlayerSession();
    refreshSession();
    closeModal();
  };

  const openModal = () => {
    setShowModal(true);
    setPhotoFile(null);
    setTransformedAvatar(null);
    setError(null);
    setEditName(session?.name || '');
    setNameSaved(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setPhotoFile(null);
    setTransformedAvatar(null);
    setError(null);
    setNameSaved(false);
  };

  if (!session) {
    return (
      <div className="view view--home">
        {logoEnlarged && (
          <div className="logo-overlay" onClick={() => setLogoEnlarged(false)}>
            <img
              src="/logo_peachgames_kupala-Photoroom.png"
              alt="PeachGames Logo"
              className="logo-overlay__img"
            />
          </div>
        )}
        <header className="view__header">
          <img
            src="/logo_peachgames_kupala-Photoroom.png"
            alt="PeachGames Logo"
            className="view__logo"
            onClick={() => setLogoEnlarged(true)}
            style={{ cursor: 'pointer' }}
          />
<h1 className="view__title">
          <span className="view__title-main">Peach Games</span>
          <span className="view__title-sub">Noc Kupały</span>
        </h1>
          <p className="view__subtitle">Witaj Wędrowcze na ziemiach PeachGames</p>
        </header>

        <main className="view__content">
          <div className="glass-panel" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ fontSize: '1.3rem', color: 'var(--color-text-main)', marginBottom: '10px' }}>
              Wymagana rejestracja
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', marginBottom: '1.2rem' }}>
              Aby uzyskać dostęp do gry, użyj linku zaproszenia od Mistrza Gry.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="view view--home view--home-focused">
      {logoEnlarged && (
        <div className="logo-overlay" onClick={() => setLogoEnlarged(false)}>
          <img
            src="/logo_peachgames_kupala-Photoroom.png"
            alt="PeachGames Logo"
            className="logo-overlay__img"
          />
          <div className="logo-overlay__intro-section" onClick={(e) => e.stopPropagation()}>
            <span className="logo-overlay__intro-title">Obejrzyj intro klanów</span>
            <div className="logo-overlay__intro-buttons">
              {CLAN_INTRO_LIST.map((clan) => {
                const icon = getClanIntroIcon(clan.label.toLowerCase());
                return (
                  <button
                    key={clan.short}
                    type="button"
                    className="logo-overlay__intro-btn"
                    style={{ '--klan-color': clan.color } as React.CSSProperties}
                    onClick={() => {
                      window.location.href = `/intro?klan=${clan.short}`;
                    }}
                    aria-label={`Odtwórz intro ${clan.label}`}
                  >
                    {icon && <img src={icon} alt="" className="logo-overlay__intro-icon" />}
                    <span className="logo-overlay__intro-label">{clan.label}</span>
                    <span className="logo-overlay__intro-play" aria-hidden="true">▶</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <header className="view__header view__header--compact">
        <img
          src="/logo_peachgames_kupala-Photoroom.png"
          alt="PeachGames Logo"
          className="view__logo view__logo--small"
          onClick={() => setLogoEnlarged(true)}
        />
        <span className="view__title-compact">Noc Kupały</span>
      </header>

      <main className="view__content view__content--home-centered">
        <GameStatusBanner status={gameStatus} />
        <div className="home-hero" style={{ '--klan-color': session.klan_color } as React.CSSProperties}>
          <div className="home-hero__avatar-wrap">
            {session.avatar_url ? (
              <>
                <img
                  src={session.avatar_url}
                  alt={session.name}
                  className="home-hero__avatar"
                />
                <button
                  className="home-hero__avatar-edit"
                  onClick={openModal}
                  title="Zmień awatar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                    <path d="m15 5 4 4"/>
                  </svg>
                </button>
              </>
            ) : (
              <button className="home-hero__avatar-add" onClick={openModal}>
                <div className="home-hero__avatar-placeholder">
                  {clanIcon.image ? (
                    <img src={clanIcon.image} alt={session.klan_name} />
                  ) : (
                    <span>{clanIcon.emoji}</span>
                  )}
                </div>
                <span className="home-hero__avatar-add-text">Dodaj zdjęcie</span>
              </button>
            )}
          </div>

          <div className="home-hero__info">
            <div className="home-hero__clan">
              {godAvatarUrl && (
                <div className="home-hero__god-avatar" onClick={() => setEnlargedAvatar(godAvatarUrl)}>
                  <img src={godAvatarUrl} alt={session.klan_name} />
                </div>
              )}
              <div className="home-hero__clan-icon" onClick={() => setShowLeaderboard(true)}>
                {clanIcon.image ? (
                  <img src={clanIcon.image} alt={session.klan_name} />
                ) : (
                  <span>{clanIcon.emoji}</span>
                )}
              </div>
              <span
                className="home-hero__clan-name"
                style={{ color: session.klan_color }}
              >
                {session.klan_name}
              </span>
            </div>

            <h2 className="home-hero__player-name">{session.name}</h2>
          </div>
        </div>

        <div className="home-aura__ogniki" onClick={() => setShowLeaderboard(true)} style={{ cursor: 'pointer' }}>
          <span className="home-aura__ogniki-icon">🔥</span>
          <span className="home-aura__ogniki-value">{klanPoints}</span>
        </div>

        {activeEffects.length > 0 && (
          <div className="home-active-effects">
            {activeEffects.map(effect => {
              const expiresAt = new Date(effect.activatedAt).getTime() + effect.durationSeconds * 1000;
              const remaining = Math.max(0, Math.floor((expiresAt - effectNow) / 1000));
              const m = Math.floor(remaining / 60);
              const s = remaining % 60;
              return (
                <div
                  key={effect.id}
                  className={`home-active-effects__item home-active-effects__item--${effect.type}`}
                >
                  <span className="home-active-effects__icon">{effect.icon}</span>
                  <span className="home-active-effects__name">{effect.name}</span>
                  <span className="home-active-effects__timer">{m}:{s.toString().padStart(2, '0')}</span>
                </div>
              );
            })}
          </div>
        )}

        <p className="home-aura__hint">
          Zbieraj ogniki, wznieś swój klan na szczyt
        </p>
      </main>

      {showModal && (
        <div className="home-modal-overlay" onClick={closeModal}>
          <div className="home-modal" onClick={(e) => e.stopPropagation()}>
            <button className="home-modal__close" onClick={closeModal}>✕</button>

            <div className="home-modal__name-row">
              <label className="home-modal__name-label">Nick:</label>
              <div className="home-modal__name-input-wrap">
                <input
                  className="home-modal__name-input"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={30}
                  placeholder="Twój pseudonim"
                />
                <button
                  className="home-modal__name-save"
                  onClick={handleSaveName}
                  disabled={
                    !editName.trim() ||
                    editName.trim() === session?.name ||
                    nameSaved
                  }
                >
                  {nameSaved ? '✓' : '💾'}
                </button>
              </div>
            </div>

            <div className="home-modal__divider" />

            <h2 className="home-modal__title">
              {transformedAvatar ? 'Nowe oblicze' : 'Zmień awatar'}
            </h2>

            {transformedAvatar && session.avatar_url ? (
              <div className="home-modal__compare">
                <div className="home-modal__compare-col">
                  <span className="home-modal__compare-label">Obecny</span>
                  <div className="home-modal__compare-preview" style={{ borderColor: session.klan_color }}>
                    <img src={session.avatar_url} alt="Obecny awatar" />
                  </div>
                </div>
                <div className="home-modal__compare-arrow">→</div>
                <div className="home-modal__compare-col">
                  <span className="home-modal__compare-label home-modal__compare-label--new">Nowy</span>
                  <div className="home-modal__compare-preview" style={{ borderColor: session.klan_color }}>
                    <img src={transformedAvatar} alt="Nowy awatar" />
                  </div>
                </div>
              </div>
            ) : transformedAvatar && !session.avatar_url ? (
              <div className="home-modal__compare">
                <div className="home-modal__compare-col">
                  <span className="home-modal__compare-label home-modal__compare-label--new">Twój awatar</span>
                  <div className="home-modal__compare-preview" style={{ borderColor: session.klan_color }}>
                    <img src={transformedAvatar} alt="Nowy awatar" />
                  </div>
                </div>
              </div>
            ) : null}

            {error && <p className="home-modal__error">{error}</p>}

            {!photoFile && !isTransforming && !transformedAvatar && (
              <button
                className="home-modal__capture"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="home-modal__capture-icon">📷</span>
                <span>Zrób zdjęcie</span>
              </button>
            )}

            {photoFile && !isTransforming && !transformedAvatar && (
              <div className="home-modal__actions">
                <button className="home-modal__action-btn home-modal__action-btn--generate" onClick={handleGenerateNewAvatar}>
                  ⚡ Wygeneruj nowe oblicze
                </button>
                <button className="home-modal__action-btn home-modal__action-btn--retake" onClick={() => fileInputRef.current?.click()}>
                  Zrób inne zdjęcie
                </button>
              </div>
            )}

            {isTransforming && (
              <div className="home-modal__loading">
                <span className="home-modal__loading-spinner">⚡</span>
                <span>Bogowie nadają Ci nowe oblicze...</span>
              </div>
            )}

            {transformedAvatar && !isTransforming && (
              <div className="home-modal__actions">
                <button
                  className="home-modal__action-btn home-modal__action-btn--save"
                  onClick={handleSaveNewAvatar}
                  disabled={isSaving}
                >
                  {isSaving ? '💾 Zapisywanie...' : '💾 Zapisz i użyj'}
                </button>
                <button
                  className="home-modal__action-btn home-modal__action-btn--discard"
                  onClick={closeModal}
                  disabled={isSaving}
                >
                  Zostaw obecny
                </button>
              </div>
            )}

            <div className="home-modal__divider" />

            <button className="home-modal__logout" onClick={handleLogout}>
              🚪 Wyloguj się
            </button>

            <input
              ref={fileInputRef}
              type="file"
              capture="user"
              accept="image/*"
              onChange={handlePhotoCapture}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      )}

      {showLeaderboard && session && (
        <ClanLeaderboardView
          session={session}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {enlargedAvatar && (
        <div className="home-god-avatar-modal" onClick={() => setEnlargedAvatar(null)}>
          <img src={enlargedAvatar} alt="Awatar boga" />
        </div>
      )}
    </div>
  );
}

function GameStatusBanner({ status }: { status: GameStatus | null }) {
  if (status === 'active') return null;

  if (status === 'finished') {
    return (
      <div className="home-status-banner home-status-banner--finished">
        <span className="home-status-banner__icon">🌙</span>
        <span className="home-status-banner__text">
          Kolo roku się odwróciło. Gra dobiegła końca.
        </span>
      </div>
    );
  }

  return (
    <div className="home-status-banner">
      <span className="home-status-banner__icon">✨</span>
      <span className="home-status-banner__text">
        Bogowie jeszcze zbierają siły. Gdy dadzą znak, rozpocznie się Noc Kupały.
      </span>
    </div>
  );
}
