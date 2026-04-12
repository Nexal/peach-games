import type { TabId } from '../../hooks/useTabNavigation';

interface TabBarProps {
  tabs: Array<{ id: TabId; label: string; icon: string; iconSrc?: string }>;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-bar__item ${activeTab === tab.id ? 'tab-bar__item--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="tab-bar__icon">
            {tab.iconSrc ? (
              <img src={tab.iconSrc} alt={tab.label} className="tab-bar__icon--img" />
            ) : tab.icon ? (
              tab.icon
            ) : null}
          </span>
          <span className="tab-bar__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
