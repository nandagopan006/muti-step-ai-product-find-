import React, { useState } from 'react';

function formatPrice(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'Price on request';
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function ProductCard({
  product,
  onOpenDetails,
  isFavorite = false,
  onToggleFavorite,
  isCompared = false,
  onToggleCompare,
}) {
  const [imageError, setImageError] = useState(false);

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

  // Filter out empty or non-string specs
  const specItems = Object.entries(specs).filter(
    ([, val]) => val !== null && val !== undefined && val !== ''
  );

  return (
    <article className="product-card" id={`product-${id}`}>
      <div className="product-image-container" onClick={() => onOpenDetails?.(product)}>
        {!imageError && image_url ? (
          <img
            src={image_url}
            alt={title || 'Product'}
            className="product-image"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="product-image-fallback">
            <span>{category ? `${category.toUpperCase()}` : 'PRODUCT'}</span>
          </div>
        )}

        {/* Favorite Bookmark Toggle Button */}
        <button
          className={`card-favorite-btn ${isFavorite ? 'favorited' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(product);
          }}
          title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
          aria-label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>

        {in_stock !== undefined && (
          <span className={`stock-badge ${in_stock ? 'in-stock' : 'out-of-stock'}`}>
            {in_stock ? 'In Stock' : 'Out of Stock'}
          </span>
        )}
      </div>

      <div className="product-card-body">
        <div className="product-meta-row">
          <div className="meta-left">
            {brand && <span className="product-brand">{brand}</span>}
            {category && <span className="product-category-badge">{category}</span>}
          </div>
          {rating && (
            <span className="product-rating-badge" title={`Customer Rating: ${rating}/5`}>
              ★ {rating.toFixed(1)}
            </span>
          )}
        </div>

        <h3
          className="product-title clickable"
          onClick={() => onOpenDetails?.(product)}
          title="Click to view full specs"
        >
          {title}
        </h3>

        <div className="product-price">{formatPrice(price)}</div>

        {description && <p className="product-description">{description}</p>}

        {specItems.length > 0 && (
          <div className="product-specs">
            {specItems.slice(0, 4).map(([key, val]) => (
              <span key={key} className="spec-badge">
                <strong>{key}:</strong> {String(val)}
              </span>
            ))}
          </div>
        )}

        <div className="product-card-footer">
          <button
            type="button"
            className={`btn-card-compare ${isCompared ? 'active' : ''}`}
            onClick={() => onToggleCompare?.(product)}
            title={isCompared ? 'Remove from compare' : 'Add to compare'}
          >
            {isCompared ? '✓ Comparing' : '+ Compare'}
          </button>

          <button
            type="button"
            className="btn-quick-view"
            onClick={() => onOpenDetails?.(product)}
          >
            Details 🔍
          </button>
        </div>
      </div>
    </article>
  );
}
