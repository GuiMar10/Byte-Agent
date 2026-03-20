import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { ConversationProvider, useConversations } from './contexts/ConversationContext.jsx';
import { SettingsProvider, useSettings } from './contexts/SettingsContext.jsx';
import { lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar/Sidebar.jsx';
import ChatView from './components/Chat/ChatView.jsx';
import Titlebar from './components/Titlebar/Titlebar.jsx';
import { useState, useEffect } from 'react';
import './App.css';

const Settings = lazy(() => import('./components/Settings/Settings.jsx'));

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { settingsOpen, setSettingsOpen, settings, activeModel } = useSettings();
  const { newChat } = useConversations();

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen((p) => !p);
      }
      if (ctrl && e.key === ',') {
        e.preventDefault();
        setSettingsOpen((p) => !p);
      }
      if (ctrl && e.key === 'n') {
        e.preventDefault();
        newChat(activeModel, settings.globalSystemPrompt);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSettingsOpen, newChat, activeModel, settings.globalSystemPrompt]);

  return (
    <div className="app-wrapper">
      <Titlebar />
      <div className="app-layout" data-sidebar={sidebarOpen ? 'open' : 'closed'}>
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((p) => !p)} />
        <main className="app-main" role="main" aria-label="Chat area">
          <ChatView onToggleSidebar={() => setSidebarOpen((p) => !p)} sidebarOpen={sidebarOpen} />
        </main>
        {settingsOpen && (
          <Suspense fallback={null}>
            <Settings onClose={() => setSettingsOpen(false)} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <ConversationProvider>
          <AppLayout />
        </ConversationProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
