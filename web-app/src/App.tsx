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
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshSession = () => {
    setSession(getPlayerSession());
  };

  useEffect(() => {
    const verifyAndSetSession = async () => {
      const pathname = window.location.pathname;
      console.log('[App] verifyAndSetSession start, pathname:', pathname);
      
      if (pathname === '/join' || pathname === '/admin') {
        console.log('[App] Skipping session verify for /join or /admin');
        setSession(null);
        return;
      }

      const stored = getPlayerSession();
      console.log('[App] stored session:', stored);
      
      if (!stored?.id || !stored?.game_id) {
        console.log('[App] No stored session, setting null');
        setSession(null);
        return;
      }

      const { data: player, error } = await supabase
        .from('players')
        .select('id, name, klan_id, joined_at, klans(id, name, theme_color)')
        .eq('id', stored.id)
        .single();

      console.log('[App] player fetch result:', { player, error });

      if (!player || !player.joined_at) {
        console.log('[App] Player not found or joined_at is null, clearing session');
        clearPlayerSession();
        setSession(null);
        return;
      }

      console.log('[App] Setting session for player:', player.name);
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
    console.log('[App] splash useEffect triggered, session:', session, 'showJoin:', showJoin, 'showAdmin:', showAdmin, 'splashShownRef:', splashShownRef.current);
    
    if (showJoin || showAdmin) {
      console.log('[App] Skipping splash for /join or /admin');
      return;
    }
    if (splashShownRef.current) {
      console.log('[App] Splash already shown, skipping');
      return;
    }
    if (!session) {
      console.log('[App] No session, skipping splash');
      return;
    }

    console.log('[App] Showing splash');
    splashShownRef.current = true;
    setShowSplash(true);
    setSplashClosing(false);

    splashTimerRef.current = setTimeout(() => {
      console.log('[App] Splash closing after 2s');
      setSplashClosing(true);
      setTimeout(() => {
        console.log('[App] Splash hidden');
        setShowSplash(false);
        setSplashClosing(false);
      }, 600);
    }, 2000);
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