import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import CodeBlock from './CodeBlock.jsx';

const Message = memo(function Message({ message, isStreaming }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div
      className={`message message--${message.role} ${isStreaming ? 'message--streaming' : ''}`}
      role="article"
      aria-label={`${message.role} message`}
    >
      <div className="message__avatar" aria-hidden="true">
        {isUser ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
        )}
      </div>
      <div className="message__content">
        <div className="message__role">
          {isUser ? 'You' : isSystem ? 'System' : 'Assistant'}
        </div>
        <div className="message__body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeHighlight]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                if (!inline && match) {
                  return (
                    <CodeBlock language={match[1]} {...props}>
                      {String(children).replace(/\n$/, '')}
                    </CodeBlock>
                  );
                }
                if (!inline) {
                  return (
                    <CodeBlock language="" {...props}>
                      {String(children).replace(/\n$/, '')}
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
            }}
          >
            {message.content}
          </ReactMarkdown>
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
      </div>
    </div>
  );
});

export default Message;
