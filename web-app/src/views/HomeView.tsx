import { useState, useEffect } from 'react';
import { getPlayerSession } from '../lib/playerSession';
import { useGame } from '../App';
import type { PlayerSession } from '../lib/playerSession';

const CLAN_ICONS: Record<string, string> = {
  perun: '⚡',
  weles: '🐺',
  mokosz: '🌿',
};

function getClanIcon(klanId: string): string {
  return CLAN_ICONS[klanId] || '⚔️';
}

export function HomeView() {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const { klanPoints } = useGame();

  useEffect(() => {
    setSession(getPlayerSession());
  }, []);

  if (!session) {
    return (
      <div className="view view--home">
        <header className="view__header">
          <img
            src="/logo_peachgames_kupala.png"
            alt="PeachGames Logo"
            className="view__logo"
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

  const clanIcon = getClanIcon(session.klan_id);

  return (
    <div className="view view--home">
      <header className="view__header view__header--relative">
        <img
          src="/logo_peachgames_kupala.png"
          alt="PeachGames Logo"
          className="view__logo"
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
            <div className="home-player-card__clan-badge" style={{ backgroundColor: session.klan_color }}>
              <span className="home-player-card__clan-icon">{clanIcon}</span>
            </div>
            <div className="home-player-card__info">
              <h2 className="home-player-card__name">{session.name}</h2>
              <p className="home-player-card__klan">{session.klan_name}</p>
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