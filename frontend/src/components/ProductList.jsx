import React, { useState, useMemo } from 'react';
import ProductCard from './ProductCard';
import { exportProductsToCSV, copySearchSummaryToClipboard } from '../utils/exportUtils';

export default function ProductList({
  products,
  onOpenDetails,
  favoriteIds = new Set(),
  onToggleFavorite,
  comparedProductIds = new Set(),
  onToggleCompare,
  query = '',
  answer = '',
  onToast,
  budget = null,
}) {
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Compute min and max prices from the current product results
  const { minPricePossible, maxPricePossible } = useMemo(() => {
    if (!products || products.length === 0) return { minPricePossible: 0, maxPricePossible: 0 };
    const validPrices = products
      .map((p) => p.price)
      .filter((pr) => typeof pr === 'number' && !isNaN(pr));
    if (validPrices.length === 0) return { minPricePossible: 0, maxPricePossible: 0 };
    return {
      minPricePossible: Math.min(...validPrices),
      maxPricePossible: Math.max(...validPrices),
    };
  }, [products]);

  // User interactive price filter state
  const [priceCap, setPriceCap] = useState(null);
  const currentMaxPrice = priceCap !== null ? priceCap : maxPricePossible;

  // Dynamically extract unique categories present in the current results
  const categories = useMemo(() => {
    if (!products) return [];
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category.toLowerCase());
    });
    return Array.from(set);
  }, [products]);

  // Filter and sort products
  const processedProducts = useMemo(() => {
    if (!products) return [];

    let list = [...products];

    // Filter by selected category
    if (selectedCategory !== 'all') {
      list = list.filter(
        (p) => (p.category || '').toLowerCase() === selectedCategory
      );
    }

    // Filter by user interactive price slider
    if (priceCap !== null) {
      list = list.filter((p) => (p.price || 0) <= priceCap);
    }

    // Sort products
    switch (sortBy) {
      case 'price_asc':
        list.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        list.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'rating_desc':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'relevance':
      default:
        // Keep initial AI ranking order
        break;
    }

    return list;
  }, [products, sortBy, selectedCategory, priceCap]);

  if (!products || products.length === 0) return null;

  const handleExportCSV = () => {
    exportProductsToCSV(processedProducts, query);
    if (onToast) {
      onToast(`Exported ${processedProducts.length} products to CSV! 📥`);
    }
  };

  const handleShareSummary = async () => {
    const success = await copySearchSummaryToClipboard(query, answer, processedProducts);
    if (success && onToast) {
      onToast('Copied search summary to clipboard! 📋');
    }
  };

  return (
    <section className="products-section" aria-label="Matching Products">
      <div className="results-toolbar">
        <div className="toolbar-left">
          <h2 className="results-title">Matching Products</h2>
          <span className="results-count">
            {processedProducts.length}{' '}
            {processedProducts.length === 1 ? 'product' : 'products'}
            {selectedCategory !== 'all' && ` in ${selectedCategory}`}
            {priceCap !== null && ` (≤ ₹${priceCap.toLocaleString('en-IN')})`}
          </span>
        </div>

        <div className="toolbar-right">
          <div className="toolbar-actions">
            <button
              type="button"
              className="btn-toolbar-action"
              onClick={handleExportCSV}
              title="Download products as CSV spreadsheet"
            >
              📥 Export CSV
            </button>
            <button
              type="button"
              className="btn-toolbar-action"
              onClick={handleShareSummary}
              title="Copy formatted AI recommendation & products to clipboard"
            >
              📋 Share
            </button>
          </div>

          <div className="sort-group">
            <label htmlFor="product-sort" className="sort-label">
              Sort by:
            </label>
            <select
              id="product-sort"
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="relevance">AI Recommendation</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Highest Rated (★)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter Panels: Category Chips & Interactive Price Slider */}
      <div className="filter-controls-row">
        {categories.length > 1 && (
          <div className="category-filter-chips">
            <span className="chips-label">Category:</span>
            <button
              className={`filter-chip ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All ({products.length})
            </button>
            {categories.map((cat) => {
              const count = products.filter(
                (p) => (p.category || '').toLowerCase() === cat
              ).length;
              return (
                <button
                  key={cat}
                  className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Dynamic Price Range Slider */}
        {maxPricePossible > minPricePossible && (
          <div className="price-slider-panel">
            <div className="price-slider-header">
              <span className="slider-label">
                💰 Max Price: <strong>₹{currentMaxPrice.toLocaleString('en-IN')}</strong>
              </span>
              {priceCap !== null && (
                <button
                  type="button"
                  className="price-reset-btn"
                  onClick={() => setPriceCap(null)}
                >
                  Reset Price
                </button>
              )}
            </div>
            <div className="slider-track-wrap">
              <span className="slider-bound">₹{minPricePossible.toLocaleString('en-IN')}</span>
              <input
                type="range"
                className="price-range-slider"
                min={minPricePossible}
                max={maxPricePossible}
                step={500}
                value={currentMaxPrice}
                onChange={(e) => setPriceCap(Number(e.target.value))}
                aria-label="Filter products by maximum price"
              />
              <span className="slider-bound">₹{maxPricePossible.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Product Cards Grid */}
      <div className="products-grid">
        {processedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onOpenDetails={onOpenDetails}
            isFavorite={favoriteIds.has(product.id)}
            onToggleFavorite={onToggleFavorite}
            isCompared={comparedProductIds.has(product.id)}
            onToggleCompare={onToggleCompare}
            budget={budget || (priceCap !== null ? priceCap : null)}
          />
        ))}
      </div>
    </section>
  );
}
