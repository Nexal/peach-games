import { useState, useEffect } from 'react';
import { getPlayerSession } from '../lib/playerSession';
import type { PlayerSession } from '../lib/playerSession';

export function HomeView() {
  const [session, setSession] = useState<PlayerSession | null>(null);

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
          <h1 className="view__title">Noc Kupały</h1>
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
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Link powinien wyglądać mniej więcej tak:<br />
              <code style={{ color: 'var(--color-perun)' }}>https://.../join?game=...</code>
            </p>
          </div>

          <div className="glass-panel">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', margin: '0 0 8px 0' }}>
              Status Systemu
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              <li>📡 Sygnał Bogów: <span style={{ color: 'var(--color-mokosz)' }}>Aktywny</span></li>
              <li>🔒 Dostęp gracza: <span style={{ color: '#ff4444' }}>Zablokowany</span></li>
              <li>⚔️ Aktywne Klany: <span style={{ color: 'var(--color-perun)' }}>3</span></li>
            </ul>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="view view--home">
      <header className="view__header">
        <img
          src="/logo_peachgames_kupala.png"
          alt="PeachGames Logo"
          className="view__logo"
        />
        <h1 className="view__title">Noc Kupały</h1>
        <p className="view__subtitle">
          Witaj, <span style={{ color: session.klan_color }}>{session.name}</span>!
          Klan: {session.klan_name}
        </p>
      </header>

      <main className="view__content">
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text-main)', margin: '0 0 10px 0' }}>
            Runa Początku
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', marginBottom: '1.2rem' }}>
            Zeskanuj kod aby poznać swój Klan i dołączyć do próby.
          </p>
          <button className="button-glow" style={{ width: '100%' }}>
            Inicjuj Skaner
          </button>
        </div>

        <div className="glass-panel">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', margin: '0 0 8px 0' }}>
            Status Gry
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            <li>📡 Sygnał Bogów: <span style={{ color: 'var(--color-mokosz)' }}>Aktywny</span></li>
            <li>🔮 Mroczny Rave: <span style={{ color: 'var(--color-weles)' }}>Oczekuje</span></li>
            <li>⚔️ Twój Klan: <span style={{ color: session.klan_color }}>{session.klan_name}</span></li>
          </ul>
        </div>
      </main>
    </div>
  );
}