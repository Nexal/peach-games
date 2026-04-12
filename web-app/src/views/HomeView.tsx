export function HomeView() {
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
            Status Systemu
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            <li>📡 Sygnał Bogów: <span style={{ color: 'var(--color-mokosz)' }}>Aktywny</span></li>
            <li>🔮 Mroczny Rave: <span style={{ color: 'var(--color-weles)' }}>Oczekuje</span></li>
            <li>⚔️ Aktywne Klany: <span style={{ color: 'var(--color-perun)' }}>3</span></li>
          </ul>
        </div>
      </main>
    </div>
  );
}
