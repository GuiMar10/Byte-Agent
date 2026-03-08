import { useState, useMemo } from "react";
import { useConversations } from "../../contexts/ConversationContext.jsx";
import { useSettings } from "../../contexts/SettingsContext.jsx";
import "./Sidebar.css";

export default function Sidebar({ isOpen, onToggle }) {
  const {
    conversations,
    activeConversationId,
    newChat,
    selectConversation,
    deleteConversation,
    togglePin,
  } = useConversations();
  const { activeModel, settings, setSettingsOpen } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState(null);

  const filteredConversations = useMemo(() => {
    const nonEmpty = conversations.filter(
      (c) => c.messages && c.messages.length > 0,
    );
    if (!searchQuery.trim()) return nonEmpty;
    const q = searchQuery.toLowerCase();
    return nonEmpty.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }, [conversations, searchQuery]);

  const pinnedConversations = filteredConversations.filter((c) => c.pinned);
  const unpinnedConversations = filteredConversations.filter((c) => !c.pinned);

  const handleNewChat = async () => {
    await newChat(activeModel, settings.globalSystemPrompt);
  };

  const handleContextMenu = (e, conv) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, conv });
  };

  const closeContextMenu = () => setContextMenu(null);

  return (
    <>
      <aside
        className={`sidebar ${isOpen ? "sidebar--open" : "sidebar--closed"}`}
        role="navigation"
        aria-label="Conversations"
      >
        <div className="sidebar__header">
          <button
            className="sidebar__toggle"
            onClick={onToggle}
            aria-label="Toggle sidebar"
            title="Toggle sidebar (Ctrl+B)"
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
          <button
            className="sidebar__new-chat"
            onClick={handleNewChat}
            aria-label="New chat"
            title="New Chat (Ctrl+N)"
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <div className="sidebar__search">
          <svg
            className="sidebar__search-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="sidebar__search-input"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search conversations"
          />
        </div>

        <div className="sidebar__list" role="list">
          {pinnedConversations.length > 0 && (
            <div className="sidebar__section">
              <div className="sidebar__section-label">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11.2V22H12.8V16H18V14L16 12Z" />
                </svg>
                Pinned
              </div>
              {pinnedConversations.map((conv) => (
                <ChatItem
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === activeConversationId}
                  onSelect={() => selectConversation(conv.id)}
                  onContextMenu={(e) => handleContextMenu(e, conv)}
                />
              ))}
            </div>
          )}

          <div className="sidebar__section">
            {pinnedConversations.length > 0 &&
              unpinnedConversations.length > 0 && (
                <div className="sidebar__section-label">Recent</div>
              )}
            {unpinnedConversations.map((conv) => (
              <ChatItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConversationId}
                onSelect={() => selectConversation(conv.id)}
                onContextMenu={(e) => handleContextMenu(e, conv)}
              />
            ))}
          </div>

          {filteredConversations.length === 0 && (
            <div className="sidebar__empty">
              {searchQuery
                ? "No matching results"
                : "Your chats will appear here."}
            </div>
          )}
        </div>

        <div className="sidebar__footer">
          <button
            className="sidebar__footer-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            title="Settings (Ctrl+,)"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="context-menu-overlay" onClick={closeContextMenu} />
          <div
            className="context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="context-menu__item"
              onClick={() => {
                togglePin(contextMenu.conv.id);
                closeContextMenu();
              }}
            >
              {contextMenu.conv.pinned ? "Unpin" : "Pin"}
            </button>
            <button
              className="context-menu__item context-menu__item--danger"
              onClick={() => {
                deleteConversation(contextMenu.conv.id);
                closeContextMenu();
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </>
  );
}

function ChatItem({ conv, isActive, onSelect, onContextMenu }) {
  return (
    <button
      className={`sidebar__item ${isActive ? "sidebar__item--active" : ""}`}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      role="listitem"
      aria-current={isActive ? "true" : undefined}
      title={conv.title}
    >
      <svg
        className="sidebar__item-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span className="sidebar__item-title">{conv.title}</span>
    </button>
  );
}
