import { useState } from 'react';

export type TabId = 'home' | 'map' | 'chat' | 'quests' | 'shop' | 'profile';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
  iconSrc?: string;
}

const tabs: Tab[] = [
  { id: 'home', label: 'ᚡᛁᛊᛏᚨ', icon: '', iconSrc: '/icons/home.png' },
  { id: 'map', label: 'ᛗᚨᛈᚨ', icon: '🗺️', iconSrc: undefined },
  { id: 'chat', label: 'ᚷᛚᚨᛊᛒᚨᛁᚱ', icon: '', iconSrc: '/icons/glos-bogow.png' },
  { id: 'quests', label: 'ᛈᚱᚨᛒᚤ', icon: '', iconSrc: '/icons/quests.png' },
  { id: 'shop', label: 'ᛊᚲᛟᛈ', icon: '', iconSrc: '/icons/shop.png' },
];

export function useTabNavigation() {
  const [activeTab, setActiveTab] = useState<TabId>('home');

  return {
    activeTab,
    setActiveTab,
    tabs,
  };
}
