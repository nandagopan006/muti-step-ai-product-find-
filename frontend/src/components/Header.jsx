import React from 'react';

export default function Header({ favoritesCount = 0, onOpenFavorites }) {
  return (
    <header className="app-header">
      <div className="header-top-bar">
        <div className="brand-badge">
          <span className="brand-badge-dot" />
          Multi-Step AI Product Search
        </div>

        {onOpenFavorites && (
          <button
            className="btn-header-favorites"
            onClick={onOpenFavorites}
            title="View saved favorites"
          >
            ❤️ Favorites{' '}
            {favoritesCount > 0 && (
              <span className="header-favorites-badge">{favoritesCount}</span>
            )}
          </button>
        )}
      </div>

      <h1 className="app-title">
        Find Exactly What You <span>Need</span>
      </h1>
      <p className="app-subtitle">
        Describe what you are looking for in plain English. Our AI analyzes your requirements,
        searches the catalog, and explains why each product matches.
      </p>
    </header>
  );
}
