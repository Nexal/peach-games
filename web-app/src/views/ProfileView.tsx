import { useState, useEffect } from 'react';
import { getPlayerSession, clearPlayerSession } from '../lib/playerSession';
import type { PlayerSession } from '../lib/playerSession';
import { CursesView } from './profile/CursesView';

type ProfileTab = 'profile' | 'curses';

export function ProfileView() {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');

  useEffect(() => {
    setSession(getPlayerSession());
  }, []);

  const handleLogout = () => {
    if (!session) return;
    const gameId = session.game_id;
    clearPlayerSession();
    setSession(null);
    window.location.href = gameId ? `/join?game=${gameId}` : '/';
  };

  if (!session) {
    return (
      <div className="view view--profile">
        <header className="view__header">
          <h1 className="view__title view__title--small">👤 Profil</h1>
          <p className="view__subtitle">Nie jesteś zalogowany</p>
        </header>

        <main className="view__content">
          <div className="placeholder-panel glass-panel">
            <div className="placeholder-panel__icon">🔒</div>
            <h2 className="placeholder-panel__title">Brak sesji</h2>
            <p className="placeholder-panel__text">
              Dołącz do gry przez link zaproszenia, aby zobaczyć swój profil.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (activeTab === 'curses') {
    return (
      <div className="view view--profile">
        <CursesView onBack={() => setActiveTab('profile')} />
      </div>
    );
  }

  return (
    <div className="view view--profile">
      <header className="view__header view__header--relative">
        <button
          className="profile-close-btn"
          onClick={() => window.history.back()}
          title="Wróć"
        >
          ←
        </button>
        <div
          className="profile-avatar"
          style={{ borderColor: session.klan_color }}
        >
          <span
            className="profile-avatar__color"
            style={{ backgroundColor: session.klan_color }}
          />
        </div>
        <h1 className="view__title view__title--small">{session.name}</h1>
        <p className="view__subtitle">Gracz klanu {session.klan_name}</p>
      </header>

      <div className="profile-tabs">
        <button className="profile-tab profile-tab--active">👤 Profil</button>
        <button
          className="profile-tab"
          onClick={() => setActiveTab('curses')}
        >
          💀 Klątwy
        </button>
      </div>

      <main className="view__content">
        <div className="profile-card glass-panel">
          <div className="profile-card__row">
            <span className="profile-card__label">Klan</span>
            <div className="profile-card__klan">
              <span
                className="profile-card__klan-color"
                style={{ backgroundColor: session.klan_color }}
              />
              <span>{session.klan_name}</span>
            </div>
          </div>

          <div className="profile-card__row">
            <span className="profile-card__label">ID Sesji</span>
            <span className="profile-card__value">{session.id.slice(0, 8)}...</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="profile-logout"
        >
          Wyloguj się
        </button>
      </main>
    </div>
  );
}
