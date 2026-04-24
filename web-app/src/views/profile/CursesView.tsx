import { useState, useEffect } from 'react';
import { getPlayerSession } from '../../lib/playerSession';
import './CursesView.css';

export type ClanItem = {
  id: string;
  klan_id: string;
  name: string;
  description: string | null;
  type: 'curse' | 'buff' | 'debuff';
  target_type: 'player' | 'klan' | 'global';
  effect: Record<string, unknown>;
  duration_seconds: number | null;
  cooldown_seconds: number;
  uses_remaining: number | null;
  active: boolean;
  activated_at: string | null;
  created_at: string | null;
};

const MOCK_ITEMS: ClanItem[] = [
  {
    id: '1',
    klan_id: 'mock',
    name: 'Klątwa Ciszy',
    description: 'Ukrywa wszystkich członków klanu na 30 sekund',
    type: 'curse',
    target_type: 'klan',
    effect: { stealth: 30 },
    duration_seconds: 30,
    cooldown_seconds: 120,
    uses_remaining: 3,
    active: false,
    activated_at: null,
    created_at: null,
  },
  {
    id: '2',
    klan_id: 'mock',
    name: 'Moc Przodków',
    description: '+50% prędkości dla całego klanu na 60 sekund',
    type: 'buff',
    target_type: 'klan',
    effect: { speed_modifier: 1.5 },
    duration_seconds: 60,
    cooldown_seconds: 180,
    uses_remaining: 2,
    active: false,
    activated_at: null,
    created_at: null,
  },
  {
    id: '3',
    klan_id: 'mock',
    name: 'Oczy Welesa',
    description: 'Odkrywa ukrytych graczy na mapie',
    type: 'debuff',
    target_type: 'global',
    effect: { reveal_stealth: true },
    duration_seconds: null,
    cooldown_seconds: 300,
    uses_remaining: 1,
    active: false,
    activated_at: null,
    created_at: null,
  },
  {
    id: '4',
    klan_id: 'mock',
    name: 'Błogosławieństwo Peruna',
    description: 'Dodaje +25 punktów forsy wszystkim członkom klanu',
    type: 'buff',
    target_type: 'klan',
    effect: { bonus_points: 25 },
    duration_seconds: null,
    cooldown_seconds: 600,
    uses_remaining: 5,
    active: false,
    activated_at: null,
    created_at: null,
  },
  {
    id: '5',
    klan_id: 'mock',
    name: 'Klątwa Zawiści',
    description: 'Odbiera 10 punktów forsy wybranemu klanowi',
    type: 'curse',
    target_type: 'klan',
    effect: { steal_points: 10 },
    duration_seconds: null,
    cooldown_seconds: 300,
    uses_remaining: 2,
    active: false,
    activated_at: null,
    created_at: null,
  },
];

type Props = {
  onBack?: () => void;
};

export function CursesView({ onBack }: Props) {
  const session = getPlayerSession();
  const [items, setItems] = useState<ClanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'curses' | 'buffs' | 'debuffs'>('curses');

  useEffect(() => {
    loadClanItems();
  }, [session?.klan_id]);

  const loadClanItems = async () => {
    setItems(MOCK_ITEMS);
    setLoading(false);
  };

  const handleActivate = (item: ClanItem) => {
    setItems(items.map(i =>
      i.id === item.id ? { ...i, active: true, activated_at: new Date().toISOString() } : i
    ));
  };

  const handleDeactivate = (item: ClanItem) => {
    setItems(items.map(i =>
      i.id === item.id ? { ...i, active: false, activated_at: null } : i
    ));
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'curses') return item.type === 'curse';
    if (activeTab === 'buffs') return item.type === 'buff';
    if (activeTab === 'debuffs') return item.type === 'debuff';
    return true;
  });

  const getTypeIcon = (type: string) => {
    if (type === 'curse') return '💀';
    if (type === 'buff') return '✨';
    if (type === 'debuff') return '👁️';
    return '❓';
  };

  const getTypeColor = (type: string) => {
    if (type === 'curse') return 'var(--color-weles)';
    if (type === 'buff') return 'var(--color-perun)';
    if (type === 'debuff') return 'var(--color-mokosz)';
    return '#888';
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Natychmiast';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  if (loading) {
    return (
      <div className="curses-view">
        <div className="curses-loading">Ładowanie przedmiotów...</div>
      </div>
    );
  }

  return (
    <div className="curses-view">
      <header className="curses-header">
        {onBack && (
          <button className="curses-back" onClick={onBack}>
            ← Profil
          </button>
        )}
        <h2 className="curses-title">Klany i Klątwy</h2>
        <p className="curses-subtitle">Aktywuj moce swojego klanu</p>
      </header>

      <div className="curses-tabs">
        <button
          className={`curses-tab ${activeTab === 'curses' ? 'curses-tab--active' : ''}`}
          onClick={() => setActiveTab('curses')}
        >
          💀 Klątwy
        </button>
        <button
          className={`curses-tab ${activeTab === 'buffs' ? 'curses-tab--active' : ''}`}
          onClick={() => setActiveTab('buffs')}
        >
          ✨ Boży
        </button>
        <button
          className={`curses-tab ${activeTab === 'debuffs' ? 'curses-tab--active' : ''}`}
          onClick={() => setActiveTab('debuffs')}
        >
          👁️ Szpieg
        </button>
      </div>

      <div className="curses-list">
        {filteredItems.length === 0 && (
          <div className="curses-empty">
            Brak przedmiotów tego typu
          </div>
        )}
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`curse-card ${item.active ? 'curse-card--active' : ''}`}
            style={{ borderColor: getTypeColor(item.type) }}
          >
            <div className="curse-card__header">
              <span className="curse-card__icon">{getTypeIcon(item.type)}</span>
              <span className="curse-card__name">{item.name}</span>
              {item.active && <span className="curse-card__badge">AKTYWNA</span>}
            </div>

            <p className="curse-card__desc">{item.description}</p>

            <div className="curse-card__meta">
              <span>⏱️ {formatDuration(item.duration_seconds)}</span>
              {item.uses_remaining !== null && (
                <span>📦 {item.uses_remaining} użyć</span>
              )}
              {item.cooldown_seconds > 0 && (
                <span>⏳ {item.cooldown_seconds}s CD</span>
              )}
            </div>

            <button
              className={`curse-card__btn ${item.active ? 'curse-card__btn--deactivate' : 'curse-card__btn--activate'}`}
              onClick={() => item.active ? handleDeactivate(item) : handleActivate(item)}
            >
              {item.active ? 'Dezaktywuj' : 'Aktywuj'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
