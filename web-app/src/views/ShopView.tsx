export function ShopView() {
  return (
    <div className="view view--shop">
      <header className="view__header">
        <h1 className="view__title view__title--small">⚗️ Sklep Żercy</h1>
        <p className="view__subtitle">Buffy i klątwy dla Twojego Klanu</p>
      </header>

      <main className="view__content">
        <div className="placeholder-panel glass-panel">
          <div className="placeholder-panel__icon">⚗️</div>
          <h2 className="placeholder-panel__title">Wkrótce dostępne</h2>
          <p className="placeholder-panel__text">
            Wymieniaj punkty na moce i rzucaj klątwy na wrogie klany.
          </p>
        </div>
      </main>
    </div>
  );
}
