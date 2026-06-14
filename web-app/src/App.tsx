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
import { getPlayerSession, clearPlayerSession, type PlayerSession } from './lib/playerSession';
import { supabase } from './lib/supabase';
import { GameProvider } from './hooks/useGameProvider';
import { PlayerPositionProvider } from './hooks/usePlayerPosition';
import { useGameStatus, type GameStatus } from './hooks/useGameStatus';
import { useScreenWakeLock } from './hooks/useScreenWakeLock';
import './views/Views.css';
import './components/tab-bar/TabBar.css';

interface PlayerContextValue {
  session: PlayerSession | null;
  refreshSession: () => void;
  gameStatus: GameStatus | null;
}

const PlayerContext = createContext<PlayerContextValue>({
  session: null,
  refreshSession: () => {},
  gameStatus: null,
});

function AppContent() {
  const { activeTab, setActiveTab, tabs } = useTabNavigation();
  const { isAuthenticated } = useAdminAuth();
  const [showAdmin, setShowAdmin] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const { status: gameStatus } = useGameStatus(session?.game_id);
  const [showSplash, setShowSplash] = useState(false);
  const [splashClosing, setSplashClosing] = useState(false);
  const splashShownRef = useRef(false);
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshSession = () => {
    setSession(getPlayerSession());
  };

  useEffect(() => {
    const verifyAndSetSession = async () => {
      const pathname = window.location.pathname;
      if (pathname === '/join' || pathname === '/admin') {
        setSession(null);
        return;
      }

      const stored = getPlayerSession();
      if (!stored?.id || !stored?.game_id) {
        setSession(null);
        return;
      }

      const { data: player } = await supabase
        .from('players')
        .select('id, name, klan_id, joined_at, klans(id, name, theme_color)')
        .eq('id', stored.id)
        .single();

      if (!player || !player.joined_at) {
        clearPlayerSession();
        setSession(null);
        return;
      }

      setSession({
        id: player.id,
        player_id: player.id,
        name: player.name,
        klan_id: player.klan_id || '',
        klan_name: (player.klans as any)?.name || 'Nieznany',
        klan_color: (player.klans as any)?.theme_color || '#888',
        game_id: stored.game_id,
        session_start: stored.session_start,
      });
    };

    verifyAndSetSession();

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

    splashTimerRef.current = setTimeout(() => {
      setSplashClosing(true);
      setTimeout(() => {
        setShowSplash(false);
        setSplashClosing(false);
      }, 600);
    }, 2000);
  }, [showJoin, showAdmin, session]);

  const wakeLockActive = !!session || (showAdmin && isAuthenticated);
  useScreenWakeLock(wakeLockActive);

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
    <PlayerContext.Provider value={{ session, refreshSession, gameStatus }}>
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