import { useState, useEffect, createContext, useContext } from 'react';
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
import './views/Views.css';
import './components/tab-bar/TabBar.css';

// Context for player session
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
  const [session, setSession] = useState<PlayerSession | null>(null);

  const refreshSession = () => {
    setSession(getPlayerSession());
  };

  useEffect(() => {
    // Initial session load
    setSession(getPlayerSession());

    const handleRouteChange = () => {
      const pathname = window.location.pathname;
      setShowAdmin(pathname === '/admin');
      setShowJoin(pathname === '/join');
    };
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('pushState', handleRouteChange);
    handleRouteChange();
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('pushState', handleRouteChange);
    };
  }, []);

  const renderView = () => {
    // Admin routes - no player session required
    if (showAdmin) {
      if (!isAuthenticated) {
        return <AdminLoginView />;
      }
      return <AdminDashboardView />;
    }

    // Join route - used to login, no session required
    if (showJoin) {
      return <JoinView />;
    }

    // All game routes require player session
    if (!session) {
      return <HomeView />;
    }

    switch (activeTab) {
      case 'home':
        return <HomeView />;
      case 'map':
        return <MapView />;
      case 'chat':
        return <ChatView />;
      case 'quests':
        return <QuestsView />;
      case 'shop':
        return <ShopView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <PlayerContext.Provider value={{ session, refreshSession }}>
      <>
        {renderView()}
        {!showAdmin && !showJoin && session && <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />}
      </>
    </PlayerContext.Provider>
  );
}

export function usePlayerSession() {
  return useContext(PlayerContext);
}

function App() {
  return (
    <AdminAuthProvider>
      <AppContent />
    </AdminAuthProvider>
  );
}

export default App;