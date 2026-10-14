import React from 'react';

const EXAMPLE_QUERIES = [
  'Lenovo laptop under 60000 with 16GB RAM',
  'Samsung smartphone under 30000',
  'Wireless headphones with ANC under 20000',
  'Gaming laptop with 16GB RAM',
];

export default function SearchBar({
  query,
  setQuery,
  onSearch,
  isLoading,
  validationError,
  setValidationError,
  recentSearches = [],
  onClearRecentSearches,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setValidationError('Please enter a search message.');
      return;
    }
    setValidationError('');
    onSearch(query);
  };

  const handleQueryClick = (text) => {
    setQuery(text);
    setValidationError('');
    onSearch(text);
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    if (validationError) {
      setValidationError('');
    }
  };

  return (
    <section className="search-card" aria-label="Product Search">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-wrapper">
          <input
            id="product-search-input"
            type="text"
            className="search-input"
            value={query}
            onChange={handleChange}
            placeholder="e.g. Find me a Lenovo laptop under 60k with 16GB RAM..."
            disabled={isLoading}
            autoComplete="off"
          />
        </div>

        {validationError && (
          <p style={{ color: 'var(--error-text)', fontSize: '0.85rem' }}>
            {validationError}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            id="product-search-button"
            type="submit"
            className="search-button"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? 'Searching...' : 'Search Products'}
          </button>
        </div>
      </form>

      {/* Recent Searches (if any) */}
      {recentSearches.length > 0 && (
        <div className="recent-searches">
          <div className="recent-searches-header">
            <span className="recent-searches-label">🕒 Recent:</span>
            <button
              type="button"
              className="btn-clear-recent"
              onClick={onClearRecentSearches}
              title="Clear recent searches"
            >
              Clear
            </button>
          </div>
          <div className="example-chips">
            {recentSearches.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="example-chip recent-chip"
                onClick={() => handleQueryClick(item)}
                disabled={isLoading}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Queries */}
      <div className="example-queries">
        <span className="example-queries-label">💡 Try asking:</span>
        <div className="example-chips">
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example}
              type="button"
              className="example-chip"
              onClick={() => handleQueryClick(example)}
              disabled={isLoading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
