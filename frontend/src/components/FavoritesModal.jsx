import React, { useEffect } from 'react';

function formatPrice(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'Price on request';
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function FavoritesModal({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
  onClearAll,
  onSelectProduct,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container favorites-modal" onClick={(e) => e.stopPropagation()}>
        <div className="favorites-modal-header">
          <div className="favorites-header-title">
            <h3>Saved Favorites ({favorites.length})</h3>
            <span className="favorites-subtitle">Quick access to products you loved</span>
          </div>
          <div className="favorites-header-actions">
            {favorites.length > 0 && (
              <button className="btn-text-danger" onClick={onClearAll}>
                Clear All
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        <div className="favorites-modal-body">
          {favorites.length === 0 ? (
            <div className="favorites-empty">
              <span className="favorites-empty-icon">🤍</span>
              <p>No favorites saved yet.</p>
              <span className="favorites-empty-hint">
                Click the heart icon on any product card to save it here!
              </span>
            </div>
          ) : (
            <div className="favorites-list">
              {favorites.map((product) => (
                <div key={product.id} className="favorite-item-card">
                  <div
                    className="favorite-item-info"
                    onClick={() => {
                      onSelectProduct(product);
                      onClose();
                    }}
                  >
                    <div className="favorite-item-image-wrapper">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.title} />
                      ) : (
                        <div className="product-image-fallback small">
                          <span>{product.category || 'ITEM'}</span>
                        </div>
                      )}
                    </div>
                    <div className="favorite-item-text">
                      <span className="favorite-item-brand">{product.brand}</span>
                      <h4 className="favorite-item-title">{product.title}</h4>
                      <span className="favorite-item-price">{formatPrice(product.price)}</span>
                    </div>
                  </div>
                  <button
                    className="btn-remove-favorite"
                    title="Remove from favorites"
                    onClick={() => onRemoveFavorite(product.id)}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
