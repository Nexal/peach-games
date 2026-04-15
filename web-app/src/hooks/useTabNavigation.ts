import { useState } from 'react';

export type TabId = 'home' | 'chat' | 'quests' | 'shop' | 'profile';

interface Tab {
  id: TabId;
  label: string;
  icon: string; // emoji or image path
  iconSrc?: string; // for image icons
}

const tabs: Tab[] = [
  { id: 'home', label: 'ᚡᛁᛊᛏᚨ', icon: '', iconSrc: '/icons/home.png' },
  { id: 'chat', label: 'ᚷᛚᚨᛊᛒᚨᛁᚱ', icon: '', iconSrc: '/icons/glos-bogow.png' },
  { id: 'quests', label: 'ᛈᚱᚨᛒᚤ', icon: '', iconSrc: '/icons/quests.png' },
  { id: 'shop', label: 'ᛊᚲᛟᛈ', icon: '', iconSrc: '/icons/shop.png' },
  { id: 'profile', label: 'ᛈᚱᚢᚠᛁᛚ', icon: '', iconSrc: '/icons/profile.png' },
];

export function useTabNavigation() {
  const [activeTab, setActiveTab] = useState<TabId>('home');

  return {
    activeTab,
    setActiveTab,
    tabs,
  };
}
