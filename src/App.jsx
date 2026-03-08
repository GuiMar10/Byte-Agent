import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { ConversationProvider } from './contexts/ConversationContext.jsx';
import { SettingsProvider, useSettings } from './contexts/SettingsContext.jsx';
import Sidebar from './components/Sidebar/Sidebar.jsx';
import ChatView from './components/Chat/ChatView.jsx';
import Settings from './components/Settings/Settings.jsx';
import Titlebar from './components/Titlebar/Titlebar.jsx';
import { useState, useEffect } from 'react';
import './App.css';

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { settingsOpen, setSettingsOpen, settings } = useSettings();

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
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSettingsOpen]);

  return (
    <div className="app-wrapper">
      <Titlebar />
      <div className="app-layout" data-sidebar={sidebarOpen ? 'open' : 'closed'}>
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((p) => !p)} />
      <main className="app-main" role="main" aria-label="Chat area">
        <ChatView onToggleSidebar={() => setSidebarOpen((p) => !p)} sidebarOpen={sidebarOpen} />
      </main>
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
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
