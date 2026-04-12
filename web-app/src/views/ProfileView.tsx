export function ProfileView() {
  return (
    <div className="view view--profile">
      <header className="view__header">
        <h1 className="view__title view__title--small">👤 Profil</h1>
        <p className="view__subtitle">Twoja tożsamość w grze</p>
      </header>

      <main className="view__content">
        <div className="placeholder-panel glass-panel">
          <div className="placeholder-panel__icon">👤</div>
          <h2 className="placeholder-panel__title">Wkrótce dostępne</h2>
          <p className="placeholder-panel__text">
            Przegląd klanu, punkty i inventarz.
          </p>
        </div>
      </main>
    </div>
  );
}
