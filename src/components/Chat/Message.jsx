import { memo, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import CodeBlock from './CodeBlock.jsx';

const extractText = (node) => {
  if (node.type === 'text') {
    return node.value;
  }
  if (node.children) {
    return node.children.map(extractText).join('');
  }
  return '';
};

const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = node ? extractText(node).replace(/\n$/, '') : String(children).replace(/\n$/, '');
    
    if (!inline && match) {
      return (
        <CodeBlock language={match[1]} codeString={codeString} {...props}>
          {children}
        </CodeBlock>
      );
    }
    if (!inline) {
      return (
        <CodeBlock language="" codeString={codeString} {...props}>
          {children}
        </CodeBlock>
      );
    }
    return (
      <code className="message__inline-code" {...props}>
        {children}
      </code>
    );
  },
  p({ children }) {
    return <p className="message__paragraph">{children}</p>;
  },
  ul({ children }) {
    return <ul className="message__list">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="message__list message__list--ordered">{children}</ol>;
  },
  table({ children }) {
    return (
      <div className="message__table-wrap">
        <table className="message__table">{children}</table>
      </div>
    );
  },
  blockquote({ children }) {
    return <blockquote className="message__blockquote">{children}</blockquote>;
  },
};

const Message = memo(function Message({ 
  message, 
  isStreaming,
  editMessage,
  contextIsStreaming,
  activeProvider,
  activeModel,
  settings
}) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  const hasThinking = message.thinking && message.thinking.length > 0;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    setEditContent(message.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      editMessage(message.id, editContent.trim(), activeProvider, activeModel, settings);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div
      className={`message message--${message.role} ${isStreaming ? 'message--streaming' : ''}`}
      role="article"
      aria-label={`${message.role} message`}
    >
      <div className="message__content">
        {hasThinking && (
          <div className="message__thinking">
            <button
              className="message__thinking-toggle"
              onClick={() => setThinkingExpanded(!thinkingExpanded)}
              aria-expanded={thinkingExpanded}
            >
              <span className={`message__thinking-icon ${thinkingExpanded ? 'message__thinking-icon--expanded' : ''}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
              <span className="message__thinking-label">Thinking</span>
            </button>
            <div className={`message__thinking-content ${thinkingExpanded ? 'message__thinking-content--expanded' : ''}`}>
              <div className="message__thinking-text">
                {message.thinking}
              </div>
            </div>
          </div>
        )}
        <div className={`message__body ${isEditing ? 'message__body--editing' : ''}`}>
          {isEditing ? (
            <div className="message__edit">
              <textarea
                className="message__edit-textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={Math.max(3, editContent.split('\n').length)}
              />
              <div className="message__edit-actions">
                <button className="message__edit-save" onClick={handleSaveEdit} disabled={contextIsStreaming}>
                  Save & Regenerate
                </button>
                <button className="message__edit-cancel" onClick={handleCancelEdit}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, rehypeHighlight]}
              components={markdownComponents}
            >
              {message.content}
            </ReactMarkdown>
          )}
          {isStreaming && <span className="message__cursor" aria-hidden="true" />}
        </div>
        {message.images && message.images.length > 0 && (
          <div className="message__images">
            {message.images.map((img, i) => (
              <img
                key={i}
                src={`data:${img.mime};base64,${img.data}`}
                alt={img.name || 'Attached image'}
                className="message__image"
              />
            ))}
          </div>
        )}
        {!isSystem && !isStreaming && (
          <div className="message__actions">
            <button className="message__action" onClick={handleCopy} title="Copy">
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
            {isUser && (
              <button className="message__action" onClick={handleEdit} title="Edit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default Message;
