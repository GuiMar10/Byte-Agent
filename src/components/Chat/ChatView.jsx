import { useRef, useEffect } from 'react';
import { useConversations } from '../../contexts/ConversationContext.jsx';
import { useSettings } from '../../contexts/SettingsContext.jsx';
import Message from './Message.jsx';
import ChatInput from './ChatInput.jsx';
import ModelSelector from '../ModelSelector/ModelSelector.jsx';
import './Chat.css';

export default function ChatView({ onToggleSidebar, sidebarOpen }) {
  const { activeConversation, isStreaming, streamingContent } = useConversations();
  const { activeProvider, activeModel } = useSettings();
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages?.length, streamingContent]);

  return (
    <div className="chat-view">
      {/* Header */}
      <header className="chat-header" role="banner">
        {!sidebarOpen && (
          <button className="chat-header__sidebar-toggle" onClick={onToggleSidebar} aria-label="Open sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        )}
        <ModelSelector />
      </header>

      {/* Messages */}
      <div className="chat-messages" role="log" aria-label="Chat messages" aria-live="polite">
        {!activeConversation ? (
          <div className="chat-empty" role="status">
            <div className="chat-empty__icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h1 className="chat-empty__title">Byte</h1>
            <p className="chat-empty__subtitle">Start a new conversation or select one from the sidebar</p>
          </div>
        ) : activeConversation.messages.length === 0 ? (
          <div className="chat-empty" role="status">
            <h1 className="chat-empty__title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Como posso ajudar?</h1>
          </div>
        ) : (
          <div className="chat-messages__inner">
            {activeConversation.messages.map((msg) => (
              <Message key={msg.id} message={msg} />
            ))}
            {isStreaming && streamingContent && (
              <Message
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: streamingContent,
                  timestamp: Date.now(),
                }}
                isStreaming
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput />
    </div>
  );
}
