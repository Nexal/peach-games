import { useState } from 'react';

export type TabId = 'home' | 'chat' | 'quests' | 'shop' | 'profile';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { id: 'home', label: 'Strona', icon: '⌂' },
  { id: 'chat', label: 'Głos Bogów', icon: '✨' },
  { id: 'quests', label: 'Próby', icon: '🗺️' },
  { id: 'shop', label: 'Sklep', icon: '⚗️' },
  { id: 'profile', label: 'Profil', icon: '👤' },
];

export function useTabNavigation() {
  const [activeTab, setActiveTab] = useState<TabId>('home');

  return {
    activeTab,
    setActiveTab,
    tabs,
  };
}
