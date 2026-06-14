import { useState, useEffect } from 'react';
import { getPlayerSession } from '../lib/playerSession';
import { useGame, usePlayerSession } from '../App';
import { supabase } from '../lib/supabase';
import type { PlayerSession } from '../lib/playerSession';
import type { GameStatus } from '../hooks/useGameStatus';
import './HomeView.css';

const CLAN_ICONS: Record<string, { emoji: string; image?: string }> = {
  'klan peruna': { emoji: '⚡', image: '/icons/perun_icon2_wyciete.png' },
  'klan welesa': { emoji: '🐺', image: '/icons/weles_icon22-Photoroom.png' },
  'klan mokoszy': { emoji: '🌿', image: '/icons/mokosz_icon12-removebg-preview.png' },
};

function getClanIcon(klanName: string): { emoji: string; image?: string } {
  const key = klanName.toLowerCase();
  return CLAN_ICONS[key] || { emoji: '⚔️' };
}

export function HomeView() {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [logoEnlarged, setLogoEnlarged] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { klanPoints } = useGame();
  const { gameStatus } = usePlayerSession();

  useEffect(() => {
    const s = getPlayerSession();
    setSession(s);

    if (s?.id) {
      supabase
        .from('players')
        .select('avatar_url')
        .eq('id', s.id)
        .single()
        .then(({ data }) => {
          if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        });
    }
  }, []);

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

  const clanIcon = getClanIcon(session.klan_name);

  return (
    <div className="view view--home view--home-focused">
      {logoEnlarged && (
        <div className="logo-overlay" onClick={() => setLogoEnlarged(false)}>
          <img
            src="/logo_peachgames_kupala-Photoroom.png"
            alt="PeachGames Logo"
            className="logo-overlay__img"
          />
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
        <button
          className="home-profile-btn"
          onClick={() => window.history.pushState({}, '', '/profile')}
          title="Profil"
        >
          <img src="/icons/profile.png" alt="Profil" className="home-profile-btn__icon" />
        </button>
      </header>

      <main className="view__content view__content--home-centered">
        <GameStatusBanner status={gameStatus} />
        <div className="home-hero" style={{ '--klan-color': session.klan_color } as React.CSSProperties}>
          <div className="home-hero__avatar-wrap">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={session.name}
                className="home-hero__avatar"
              />
            ) : (
              <div className="home-hero__avatar-placeholder">
                {clanIcon.image ? (
                  <img src={clanIcon.image} alt={session.klan_name} />
                ) : (
                  <span>{clanIcon.emoji}</span>
                )}
              </div>
            )}
          </div>

          <div className="home-hero__info">
            <div className="home-hero__clan">
              <div className="home-hero__clan-icon">
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

        <div className="home-aura__ogniki">
          <span className="home-aura__ogniki-icon">🔥</span>
          <span className="home-aura__ogniki-value">{klanPoints}</span>
        </div>

        <p className="home-aura__hint">
          Zbieraj ogniki, wznieś swój klan na szczyt
        </p>
      </main>
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
