import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { useTabNavigation } from './hooks/useTabNavigation';
import { TabBar } from './components/tab-bar/TabBar';
import { HomeView } from './views/HomeView';
import { ChatView } from './views/ChatView';
import { MapView } from './views/MapView';
import { QuestsView } from './views/QuestsView';
import { ShopView } from './views/ShopView';
import { ProfileView } from './views/ProfileView';
import { JoinView } from './views/join/JoinView';
import { AdminAuthProvider, useAdminAuth } from './lib/admin/AdminAuth';
import { AdminLoginView } from './views/admin/AdminLoginView';
import { AdminDashboardView } from './views/admin/AdminDashboardView';
import { getPlayerSession, type PlayerSession } from './lib/playerSession';
import { GameProvider } from './hooks/useGameProvider';
import { PlayerPositionProvider } from './hooks/usePlayerPosition';
import './views/Views.css';
import './components/tab-bar/TabBar.css';

interface PlayerContextValue {
  session: PlayerSession | null;
  refreshSession: () => void;
}

const PlayerContext = createContext<PlayerContextValue>({
  session: null,
  refreshSession: () => {},
});

function AppContent() {
  const { activeTab, setActiveTab, tabs } = useTabNavigation();
  const { isAuthenticated } = useAdminAuth();
  const [showAdmin, setShowAdmin] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [showSplash, setShowSplash] = useState(false);
  const [splashClosing, setSplashClosing] = useState(false);
  const splashShownRef = useRef(false);

  const refreshSession = () => {
    setSession(getPlayerSession());
  };

  useEffect(() => {
    setSession(getPlayerSession());

    const handleRouteChange = () => {
      const pathname = window.location.pathname;
      setShowAdmin(pathname === '/admin');
      setShowJoin(pathname === '/join');
      setShowProfile(pathname === '/profile');
    };
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('pushState', handleRouteChange);
    handleRouteChange();
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('pushState', handleRouteChange);
    };
  }, []);

  useEffect(() => {
    if (showJoin || showAdmin) return;
    if (splashShownRef.current) return;
    if (!session) return;

    splashShownRef.current = true;
    setShowSplash(true);
    setSplashClosing(false);

    const timer = setTimeout(() => {
      setSplashClosing(true);
      setTimeout(() => {
        setShowSplash(false);
        setSplashClosing(false);
      }, 600);
    }, 2000);

    return () => clearTimeout(timer);
  }, [showJoin, showAdmin, session]);

  const renderView = () => {
    if (showAdmin) {
      if (!isAuthenticated) return <AdminLoginView />;
      return <AdminDashboardView />;
    }

    if (showJoin) return <JoinView />;

    if (showProfile) return <ProfileView />;

    if (!session) return <HomeView />;

    switch (activeTab) {
      case 'home': return <HomeView />;
      case 'map': return <MapView />;
      case 'chat': return <ChatView />;
      case 'quests': return <QuestsView />;
      case 'shop': return <ShopView />;
      case 'profile': return <ProfileView />;
      default: return <HomeView />;
    }
  };

  return (
    <PlayerContext.Provider value={{ session, refreshSession }}>
      <PlayerPositionProvider>
        <GameProvider>
        {showSplash && (
          <div className={`logo-overlay ${splashClosing ? 'logo-overlay--closing' : ''}`}>
            <img
              src="/logo_peachgames_kupala-Photoroom.png"
              alt="PeachGames Logo"
              className="logo-overlay__img"
            />
          </div>
        )}
        {renderView()}
        {!showAdmin && !showJoin && session && <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />}
        </GameProvider>
      </PlayerPositionProvider>
    </PlayerContext.Provider>
  );
}

export function usePlayerSession() {
  return useContext(PlayerContext);
}

export { useGame } from './hooks/useGameProvider';

function App() {
  return (
    <AdminAuthProvider>
      <AppContent />
    </AdminAuthProvider>
  );
}

export default App;