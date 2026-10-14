import React, { useState } from 'react';


function formatPrice(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'Price on request';
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function ProductCard({ product }) {
  const [imageError, setImageError] = useState(false);

  if (!product) return null;

  const {
    id,
    title,
    brand,
    category,
    price,
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
      <div className="product-image-container">
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
      </div>

      <div className="product-card-body">
        <div className="product-meta-row">
          {brand && <span className="product-brand">{brand}</span>}
          {category && <span className="product-category-badge">{category}</span>}
        </div>

        <h3 className="product-title">{title}</h3>

        <div className="product-price">{formatPrice(price)}</div>

        {description && <p className="product-description">{description}</p>}

        {specItems.length > 0 && (
          <div className="product-specs">
            {specItems.map(([key, val]) => (
              <span key={key} className="spec-badge">
                <strong>{key}:</strong> {String(val)}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
