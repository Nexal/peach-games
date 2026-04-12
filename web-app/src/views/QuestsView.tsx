export function QuestsView() {
  return (
    <div className="view view--quests">
      <header className="view__header">
        <h1 className="view__title view__title--small">🗺️ Próby</h1>
        <p className="view__subtitle">Zadania dla Twojego Klanu</p>
      </header>

      <main className="view__content">
        <div className="placeholder-panel glass-panel">
          <div className="placeholder-panel__icon">🗺️</div>
          <h2 className="placeholder-panel__title">Wkrótce dostępne</h2>
          <p className="placeholder-panel__text">
            GPS wyprawy, skanowanie totemów i zagadki runiczne zostaną tutaj udostępnione.
          </p>
        </div>
      </main>
    </div>
  );
}
