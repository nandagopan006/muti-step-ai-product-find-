import React from 'react';

export default function CompareBar({
  comparedProducts = [],
  onOpenModal,
  onRemoveItem,
  onClearAll,
}) {
  if (comparedProducts.length === 0) return null;

  return (
    <aside className="compare-floating-bar" aria-label="Compare Products Drawer">
      <div className="compare-bar-content">
        <div className="compare-bar-items">
          <span className="compare-bar-label">
            Compare ({comparedProducts.length}/4):
          </span>
          {comparedProducts.map((p) => (
            <div key={p.id} className="compare-item-pill">
              {p.image_url ? (
                <img src={p.image_url} alt={p.title} className="compare-pill-img" />
              ) : (
                <span className="compare-pill-fallback">📦</span>
              )}
              <span className="compare-pill-title" title={p.title}>
                {p.title}
              </span>
              <button
                type="button"
                className="compare-pill-remove"
                onClick={() => onRemoveItem(p.id)}
                title="Remove from comparison"
                aria-label={`Remove ${p.title} from comparison`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="compare-bar-actions">
          <button
            type="button"
            className="btn-clear-compare"
            onClick={onClearAll}
            title="Clear all selected products"
          >
            Clear
          </button>
          <button
            type="button"
            className="btn-compare-now"
            onClick={onOpenModal}
            disabled={comparedProducts.length < 2}
            title={
              comparedProducts.length < 2
                ? 'Select at least 2 products to compare'
                : 'Open comparison matrix'
            }
          >
            {comparedProducts.length < 2
              ? 'Select 1 more'
              : `Compare Now (${comparedProducts.length}) ⚖️`}
          </button>
        </div>
      </div>
    </aside>
  );
}
