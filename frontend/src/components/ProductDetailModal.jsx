import React, { useEffect } from 'react';

function formatPrice(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'Price on request';
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function ProductDetailModal({ product, onClose, isFavorite, onToggleFavorite }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  const {
    id,
    title,
    brand,
    category,
    price,
    rating,
    in_stock,
    description,
    image_url,
    specs = {},
  } = product;

  const specEntries = Object.entries(specs).filter(
    ([, val]) => val !== null && val !== undefined && val !== ''
  );

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close product details"
        >
          ✕
        </button>

        <div className="modal-content-grid">
          <div className="modal-image-wrapper">
            {image_url ? (
              <img src={image_url} alt={title} className="modal-image" />
            ) : (
              <div className="product-image-fallback modal-image-fallback">
                <span>{category ? category.toUpperCase() : 'PRODUCT'}</span>
              </div>
            )}
            {in_stock !== undefined && (
              <span className={`stock-status ${in_stock ? 'in-stock' : 'out-of-stock'}`}>
                {in_stock ? '● In Stock' : '○ Out of Stock'}
              </span>
            )}
          </div>

          <div className="modal-info">
            <div className="product-meta-row">
              {brand && <span className="product-brand">{brand}</span>}
              {category && <span className="product-category-badge">{category}</span>}
              {rating && (
                <span className="product-rating-badge">
                  ★ {rating.toFixed(1)}
                </span>
              )}
            </div>

            <h2 className="modal-title">{title}</h2>

            <div className="modal-price-row">
              <span className="modal-price">{formatPrice(price)}</span>
              <span className="modal-tax-note">Inclusive of all taxes</span>
            </div>

            {description && <p className="modal-description">{description}</p>}

            {specEntries.length > 0 && (
              <div className="modal-specs-section">
                <h4 className="modal-section-title">Technical Specifications</h4>
                <div className="modal-specs-table">
                  {specEntries.map(([key, val]) => (
                    <div key={key} className="modal-spec-row">
                      <span className="modal-spec-key">{key}</span>
                      <span className="modal-spec-val">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions-row">
              <button
                className={`btn-action btn-favorite ${isFavorite ? 'active' : ''}`}
                onClick={() => onToggleFavorite(product)}
              >
                {isFavorite ? '❤️ Saved to Favorites' : '🤍 Add to Favorites'}
              </button>
              <button
                className="btn-action btn-primary"
                onClick={() => alert(`Simulated store checkout for: ${title}`)}
              >
                Buy Now 🛍️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
