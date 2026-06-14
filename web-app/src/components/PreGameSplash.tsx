import type { GameStatus } from '../hooks/useGameStatus';
import './PreGameSplash.css';

export type LockedView = 'map' | 'quests' | 'shop';

interface PreGameSplashProps {
  view: LockedView;
  status?: GameStatus | null;
}

const VIEW_CONFIG: Record<LockedView, { icon: string; title: string; description: string }> = {
  map: {
    icon: '🗺️',
    title: 'Tereny jeszcze się nie odsłoniły',
    description:
      'Gdy Bogowie nakażą, tu pojawią się święte miejsca, bazy i ścieżki Twojego klanu. Póki co – cierpliwość, wędrowcze.',
  },
  quests: {
    icon: '🏆',
    title: 'Próby czekają na znak z góry',
    description:
      'Tu ujrzysz zadania przygotowane dla Twojego klanu. Czas próby jeszcze nie nadszedł, lecz przygotuj swój duch i miecz.',
  },
  shop: {
    icon: '⚗️',
    title: 'Żerca jeszcze nie otworzył stołu',
    description:
      'Gdy gra się rozpocznie, kupisz tu moc i klątwy za ogniki zdobyte w walce. Teraz trwają jeszcze przygotowania.',
  },
};

const STATUS_MESSAGE: Record<GameStatus, string> = {
  draft: 'Bogowie zbierają siły...',
  active: 'Noc Kupały trwa!',
  finished: 'Kolo roku się odwróciło.',
};

export function PreGameSplash({ view, status }: PreGameSplashProps) {
  const config = VIEW_CONFIG[view];
  const statusMessage = status ? STATUS_MESSAGE[status] : 'Czekaj na znak przeznaczenia...';

  return (
    <div className="pre-game-splash">
      <div className="pre-game-splash__rune" aria-hidden>
        ᚺ
      </div>
      <div className="pre-game-splash__content">
        <div className="pre-game-splash__icon">{config.icon}</div>
        <h2 className="pre-game-splash__title">{config.title}</h2>
        <p className="pre-game-splash__description">{config.description}</p>
        <div className="pre-game-splash__status">
          <span className="pre-game-splash__status-dot" />
          <span>{statusMessage}</span>
        </div>
      </div>
    </div>
  );
}
