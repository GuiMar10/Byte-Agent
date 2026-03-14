import { useState, useCallback, memo } from 'react';

const CodeBlock = memo(function CodeBlock({ language, children, ...props }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [children]);

  return (
    <div className="code-block" role="region" aria-label={`Code block${language ? ` in ${language}` : ''}`}>
      <div className="code-block__header">
        <span className="code-block__language">{language || 'code'}</span>
        <button
          className="code-block__copy"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy code'}
          title="Copy code"
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre className="code-block__pre">
        <code className={language ? `hljs language-${language}` : 'hljs'} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
});

export default CodeBlock;
