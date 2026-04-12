import { useTabNavigation } from './hooks/useTabNavigation';
import { TabBar } from './components/tab-bar/TabBar';
import { HomeView } from './views/HomeView';
import { ChatView } from './views/ChatView';
import { QuestsView } from './views/QuestsView';
import { ShopView } from './views/ShopView';
import { ProfileView } from './views/ProfileView';
import './views/Views.css';
import './components/tab-bar/TabBar.css';

function App() {
  const { activeTab, setActiveTab, tabs } = useTabNavigation();

  const renderView = () => {
    switch (activeTab) {
      case 'home':
        return <HomeView />;
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
    <>
      {renderView()}
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}

export default App;
