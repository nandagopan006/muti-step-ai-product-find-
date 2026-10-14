import React from 'react';

/**
 * Formats plain markdown text into clean React elements.
 * Converts **bold text** into <strong> tags without showing literal asterisks.
 */
function renderFormattedMarkdown(text) {
  if (!text) return null;

  // Remove any raw markdown image syntax like ![Alt text](url)
  const cleaned = text.replace(/!\[.*?\]\(.*?\)/g, '').trim();

  // Split into lines/paragraphs
  const lines = cleaned.split('\n');

  return lines.map((line, lineIndex) => {
    // Match and split on **bold text**
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

    // If it's an empty line, render a subtle vertical space
    if (!line.trim()) {
      return <div key={lineIndex} style={{ height: '0.65rem' }} />;
    }

    return (
      <p key={lineIndex} style={{ marginBottom: '0.45rem', lineHeight: '1.65' }}>
        {formattedLine}
      </p>
    );
  });
}

export default function AiAnswer({ answer, filtersUsed, searchPerformed }) {
  if (!answer) return null;

  const filterEntries = filtersUsed ? Object.entries(filtersUsed) : [];

  return (
    <section className="ai-answer-card" aria-label="AI Search Summary">
      <div className="ai-answer-header">
        <div className="ai-badge">
          <span>✨</span>
          <span>AI Recommendation</span>
        </div>

        {searchPerformed && filterEntries.length > 0 && (
          <div className="filters-badge-group">
            {filterEntries.map(([key, value]) => (
              <span key={key} className="filter-pill">
                <strong>{key}:</strong>{' '}
                {typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : String(value)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="ai-answer-text">
        {renderFormattedMarkdown(answer)}
      </div>
    </section>
  );
}
