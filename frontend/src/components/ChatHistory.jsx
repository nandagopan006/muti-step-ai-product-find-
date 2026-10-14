import React, { useState, useRef, useEffect } from 'react';

/**
 * Formats plain markdown text into clean React elements.
 * Converts **bold text** into <strong> tags without showing literal asterisks.
 */
function renderFormattedMarkdown(text) {
  if (!text) return null;

  const cleaned = text.replace(/!\[.*?\]\(.*?\)/g, '').trim();
  const lines = cleaned.split('\n');

  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);

    const formattedLine = parts.map((part, partIndex) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={partIndex} style={{ color: '#ffffff', fontWeight: 600 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    if (!line.trim()) {
      return <div key={lineIndex} style={{ height: '0.45rem' }} />;
    }

    return (
      <p key={lineIndex} style={{ marginBottom: '0.35rem', lineHeight: '1.6' }}>
        {formattedLine}
      </p>
    );
  });
}

function formatPrice(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '';
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function ChatHistory({
  conversations = [],
  onClear,
  onSelectQuery,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!isCollapsed) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations.length, isCollapsed]);

  if (conversations.length === 0) return null;

  return (
    <section className="chat-history" aria-label="Previous Conversation History">
      <div className="chat-history-header">
        <div className="chat-history-title-group">
          <span className="chat-history-icon">💬</span>
          <h3 className="chat-history-title">Previous Searches in this Session</h3>
          <span className="chat-history-count">
            {conversations.length} {conversations.length === 1 ? 'turn' : 'turns'}
          </span>
        </div>

        <div className="chat-history-actions">
          <button
            type="button"
            className="chat-toggle-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? '▼ Show History' : '▲ Hide History'}
          </button>
          {onClear && (
            <button
              type="button"
              className="chat-clear-btn"
              onClick={onClear}
              title="Clear previous search history"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="chat-messages-list">
          {conversations.map((entry, idx) => (
            <div key={idx} className="chat-turn">
              {/* User Message Bubble */}
              <div className="chat-bubble user-bubble">
                <div className="chat-bubble-top">
                  <span className="chat-role-label user-label">You</span>
                  <span className="chat-timestamp">{entry.timestamp}</span>
                </div>
                <p className="chat-bubble-text">{entry.query}</p>
                {onSelectQuery && (
                  <button
                    type="button"
                    className="chat-rerun-btn"
                    onClick={() => onSelectQuery(entry.query)}
                    title="Search this query again"
                  >
                    ↺ Search again
                  </button>
                )}
              </div>

              {/* AI Response Bubble */}
              <div className="chat-bubble ai-bubble">
                <div className="chat-ai-header">
                  <div className="chat-ai-title-wrap">
                    <span className="chat-role-label ai-label">✨ AI Advisor</span>
                    {entry.productCount > 0 && (
                      <span className="chat-product-count">
                        📦 {entry.productCount} {entry.productCount === 1 ? 'match' : 'matches'}
                      </span>
                    )}
                  </div>
                  {entry.filtersUsed && Object.keys(entry.filtersUsed).length > 0 && (
                    <div className="chat-filter-pills">
                      {Object.entries(entry.filtersUsed).map(([key, value]) => (
                        <span key={key} className="filter-pill small">
                          <strong>{key}:</strong>{' '}
                          {typeof value === 'number' ? formatPrice(value) : String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="chat-bubble-content">
                  {renderFormattedMarkdown(entry.answer)}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </section>
  );
}
