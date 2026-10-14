import React, { useEffect, useMemo, useState } from 'react';

function formatPrice(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'Price on request';
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function ComparisonModal({
  isOpen,
  onClose,
  products = [],
  onRemoveProduct,
  onSelectProduct,
}) {
  const [highlightDifferences, setHighlightDifferences] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Aggregate all unique specification keys across all compared products
  const allSpecKeys = useMemo(() => {
    const keys = new Set();
    products.forEach((p) => {
      if (p.specs && typeof p.specs === 'object') {
        Object.keys(p.specs).forEach((k) => keys.add(k));
      }
    });
    return Array.from(keys);
  }, [products]);

  if (!isOpen || products.length === 0) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-container comparison-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="comparison-modal-header">
          <div>
            <h3 className="comparison-title">Product Comparison Matrix</h3>
            <span className="comparison-subtitle">
              Comparing {products.length} {products.length === 1 ? 'item' : 'items'} side-by-side
            </span>
          </div>

          <div className="comparison-header-actions">
            <label className="toggle-diff-label">
              <input
                type="checkbox"
                checked={highlightDifferences}
                onChange={(e) => setHighlightDifferences(e.target.checked)}
              />
              Highlight Differences
            </label>
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="feature-col">Feature</th>
                {products.map((p) => (
                  <th key={p.id} className="product-col">
                    <div className="comparison-card-top">
                      <button
                        className="btn-col-remove"
                        onClick={() => onRemoveProduct(p.id)}
                        title="Remove product"
                      >
                        ✕
                      </button>
                      <div className="comparison-col-img-wrapper">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.title} />
                        ) : (
                          <div className="product-image-fallback small">
                            <span>{p.category || 'ITEM'}</span>
                          </div>
                        )}
                      </div>
                      <span className="comparison-col-brand">{p.brand}</span>
                      <h4 className="comparison-col-title" title={p.title}>
                        {p.title}
                      </h4>
                      <span className="comparison-col-price">{formatPrice(p.price)}</span>
                      <button
                        className="btn-col-details"
                        onClick={() => {
                          onSelectProduct(p);
                        }}
                      >
                        Inspect 🔍
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Rating Row */}
              <tr>
                <td className="feature-col">Rating</td>
                {products.map((p) => (
                  <td key={p.id} className="product-col text-center">
                    {p.rating ? (
                      <span className="product-rating-badge">★ {p.rating.toFixed(1)}</span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                ))}
              </tr>

              {/* Category Row */}
              <tr>
                <td className="feature-col">Category</td>
                {products.map((p) => (
                  <td key={p.id} className="product-col text-center">
                    <span className="product-category-badge">{p.category || 'Standard'}</span>
                  </td>
                ))}
              </tr>

              {/* Stock Status */}
              <tr>
                <td className="feature-col">Stock Status</td>
                {products.map((p) => (
                  <td key={p.id} className="product-col text-center">
                    <span
                      className={`stock-badge ${
                        p.in_stock ? 'in-stock' : 'out-of-stock'
                      }`}
                    >
                      {p.in_stock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Dynamic Specifications Rows */}
              {allSpecKeys.map((key) => {
                const values = products.map((p) => (p.specs ? p.specs[key] || '—' : '—'));
                const isDifferent =
                  new Set(values.map((v) => String(v).toLowerCase())).size > 1;

                return (
                  <tr
                    key={key}
                    className={
                      highlightDifferences && isDifferent ? 'row-difference' : ''
                    }
                  >
                    <td className="feature-col capitalize-key">{key}</td>
                    {values.map((val, idx) => (
                      <td key={products[idx].id} className="product-col text-center">
                        <span className="spec-table-value">{String(val)}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
