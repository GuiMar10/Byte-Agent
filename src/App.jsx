import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { ConversationProvider, useConversations } from './contexts/ConversationContext.jsx';
import { SettingsProvider, useSettings } from './contexts/SettingsContext.jsx';
import { lazy, Suspense, useRef, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar/Sidebar.jsx';
import ChatView from './components/Chat/ChatView.jsx';
import Titlebar from './components/Titlebar/Titlebar.jsx';
import { useState } from 'react';
import './App.css';

const Settings = lazy(() => import('./components/Settings/Settings.jsx'));

requestIdleCallback(() => Settings.preload(), { timeout: 2000 });

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { settingsOpen, setSettingsOpen, settings, activeModel } = useSettings();
  const { newChat } = useConversations();
  const chatInputRef = useRef(null);
  const settingsRef = useRef({ activeModel, globalSystemPrompt: settings.globalSystemPrompt, newChat, setSettingsOpen });

  useEffect(() => {
    settingsRef.current = { activeModel, globalSystemPrompt: settings.globalSystemPrompt, newChat, setSettingsOpen };
  }, [activeModel, settings.globalSystemPrompt, newChat, setSettingsOpen]);

  const focusChatInput = useCallback(() => {
    chatInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      const ctrl = e.ctrlKey || e.metaKey;
      const { activeModel, globalSystemPrompt, newChat, setSettingsOpen } = settingsRef.current;

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
        newChat(activeModel, globalSystemPrompt);
      }
      if (!ctrl && !e.altKey && !e.metaKey && e.key.length === 1) {
        const tag = document.activeElement?.tagName;
        const isEditable = document.activeElement?.isContentEditable;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
          focusChatInput();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusChatInput]);

  return (
    <div className="app-wrapper">
      <Titlebar />
      <div className="app-layout" data-sidebar={sidebarOpen ? 'open' : 'closed'}>
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((p) => !p)} />
        <main className="app-main" role="main" aria-label="Chat area">
          <ChatView onToggleSidebar={() => setSidebarOpen((p) => !p)} sidebarOpen={sidebarOpen} chatInputRef={chatInputRef} />
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
