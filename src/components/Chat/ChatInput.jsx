import { useState, useRef, useCallback } from 'react';
import { useConversations } from '../../contexts/ConversationContext.jsx';
import { useSettings } from '../../contexts/SettingsContext.jsx';

export default function ChatInput() {
  const { sendMessage, stopGeneration, isStreaming, activeConversation, newChat } = useConversations();
  const { activeProvider, activeModel, settings } = useSettings();
  const [input, setInput] = useState('');
  const [attachedImages, setAttachedImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleSend = useCallback(async () => {
    if (!input.trim() && attachedImages.length === 0) return;
    if (!activeProvider) return;

    const content = input.trim();
    const images = [...attachedImages];
    setInput('');
    setAttachedImages([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    if (!activeConversation) {
      await newChat(activeModel, settings.globalSystemPrompt);
      // Wait a tick for state to update
      await new Promise((r) => setTimeout(r, 50));
    }

    await sendMessage(content, images, activeProvider, activeModel, settings);
  }, [input, attachedImages, activeProvider, activeModel, settings, sendMessage, activeConversation, newChat]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) handleSend();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    // Auto-resize
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          setAttachedImages((prev) => [
            ...prev,
            { data: base64, mime: file.type, name: file.name },
          ]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeImage = (index) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
    e.target.value = '';
  };

  const processFiles = (files) => {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          setAttachedImages((prev) => [
            ...prev,
            { data: base64, mime: file.type, name: file.name },
          ]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const hasProvider = !!activeProvider;

  return (
    <div className="chat-input-wrapper">
      <div
        className={`chat-input ${isDragging ? 'chat-input--dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {attachedImages.length > 0 && (
          <div className="chat-input__attachments" role="list" aria-label="Attached images">
            {attachedImages.map((img, i) => (
              <div key={i} className="chat-input__attachment" role="listitem">
                <img src={`data:${img.mime};base64,${img.data}`} alt={img.name} />
                <button
                  className="chat-input__attachment-remove"
                  onClick={() => removeImage(i)}
                  aria-label={`Remove ${img.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="chat-input__row">
          <button
            className="chat-input__attach"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach image"
            title="Attach image"
            disabled={!hasProvider}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
          <textarea
            ref={textareaRef}
            className="chat-input__textarea"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={hasProvider ? 'Send a message…' : 'Configure a provider in Settings to start chatting'}
            disabled={!hasProvider}
            rows={1}
            aria-label="Message input"
          />

          {isStreaming ? (
            <button
              className="chat-input__stop"
              onClick={stopGeneration}
              aria-label="Stop generation"
              title="Stop generation"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              className="chat-input__send"
              onClick={handleSend}
              disabled={(!input.trim() && attachedImages.length === 0) || !hasProvider}
              aria-label="Send message"
              title="Send (Enter)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>

        {isDragging && (
          <div className="chat-input__drop-overlay" aria-hidden="true">
            <span>Drop images here</span>
          </div>
        )}
      </div>
      <div className="chat-input__hint">
        {activeProvider ? `${activeProvider.name} · ${activeModel || 'No model selected'}` : 'No provider configured'}
      </div>
    </div>
  );
}
