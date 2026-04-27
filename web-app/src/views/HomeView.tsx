import { useState, useEffect } from 'react';
import { getPlayerSession } from '../lib/playerSession';
import { useGame } from '../App';
import type { PlayerSession } from '../lib/playerSession';

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
  const { klanPoints } = useGame();

  useEffect(() => {
    setSession(getPlayerSession());
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
      <header className="view__header view__header--relative">
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
        <p className="view__subtitle">Witaj na ziemiach Kupali</p>
        <button
          className="home-profile-btn"
          onClick={() => window.history.pushState({}, '', '/profile')}
          title="Profil"
        >
          <img src="/icons/profile.png" alt="Profil" className="home-profile-btn__icon" />
        </button>
      </header>

      <main className="view__content">
        <div className="home-player-card" style={{ borderColor: session.klan_color }}>
          <div className="home-player-card__header">
            <div className="home-player-card__clan-badge">
              {clanIcon.image ? (
                <img src={clanIcon.image} alt={session.klan_name} className="home-player-card__clan-img" />
              ) : (
                <span className="home-player-card__clan-icon">{clanIcon.emoji}</span>
              )}
            </div>
            <div className="home-player-card__info">
              <h2 className="home-player-card__name">{session.name}</h2>
              <p className="home-player-card__klan" style={{ color: session.klan_color }}>{session.klan_name}</p>
            </div>
          </div>

          <div className="home-player-card__ogniki">
            <span className="home-player-card__ogniki-icon">🔥</span>
            <span className="home-player-card__ogniki-value">{klanPoints}</span>
          </div>
        </div>

        <div className="home-actions">
          <p className="home-actions__hint">🔥 Zbieraj ogniki, wznieś swój klan na szczyt!</p>
        </div>
      </main>
    </div>
  );
}