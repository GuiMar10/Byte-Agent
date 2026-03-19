import { useRef, useEffect } from "react";
import { useConversations } from "../../contexts/ConversationContext.jsx";
import { useSettings } from "../../contexts/SettingsContext.jsx";
import Message from "./Message.jsx";
import ChatInput from "./ChatInput.jsx";
import ModelSelector from "../ModelSelector/ModelSelector.jsx";
import "./Chat.css";

export default function ChatView({ onToggleSidebar, sidebarOpen }) {
  const { activeConversation, isStreaming, streamingContent, editMessage } =
    useConversations();
  const { activeProvider, activeModel, settings } = useSettings();
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages?.length, streamingContent]);

  return (
    <div className="chat-view">
      {/* Header */}
      <header className="chat-header" role="banner">
        {!sidebarOpen && (
          <button
            className="chat-header__sidebar-toggle"
            onClick={onToggleSidebar}
            aria-label="Open sidebar"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        )}
        <ModelSelector />
      </header>

      {/* Messages */}
      <div
        className="chat-messages"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {!activeConversation || activeConversation.messages.length === 0 ? (
          <div className="chat-empty" role="status">
            <h1
              className="chat-empty__title"
              style={{ fontSize: "2rem", marginBottom: "0.5rem" }}
            >
              How can I help?
            </h1>
          </div>
        ) : (
          <div className="chat-messages__inner">
            {activeConversation.messages.map((msg) => (
              <Message 
                key={msg.id} 
                message={msg} 
                editMessage={editMessage}
                contextIsStreaming={isStreaming}
                activeProvider={activeProvider}
                activeModel={activeModel}
                settings={settings}
              />
            ))}
            {isStreaming && streamingContent && (
              <Message
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streamingContent,
                  timestamp: Date.now(),
                }}
                isStreaming
                editMessage={editMessage}
                contextIsStreaming={true}
                activeProvider={activeProvider}
                activeModel={activeModel}
                settings={settings}
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
