import React, { useState, useMemo } from 'react';
import ProductCard from './ProductCard';

export default function ProductList({
  products,
  onOpenDetails,
  favoriteIds = new Set(),
  onToggleFavorite,
  comparedProductIds = new Set(),
  onToggleCompare,
}) {
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedCategory, setSelectedCategory] = useState('all');

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
  }, [products, sortBy, selectedCategory]);

  if (!products || products.length === 0) return null;

  return (
    <section className="products-section" aria-label="Matching Products">
      <div className="results-toolbar">
        <div className="toolbar-left">
          <h2 className="results-title">Matching Products</h2>
          <span className="results-count">
            {processedProducts.length}{' '}
            {processedProducts.length === 1 ? 'product' : 'products'}
            {selectedCategory !== 'all' && ` in ${selectedCategory}`}
          </span>
        </div>

        <div className="toolbar-right">
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

      {/* Category Filter Chips (if more than 1 category in result) */}
      {categories.length > 1 && (
        <div className="category-filter-chips">
          <span className="chips-label">Filter Category:</span>
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
          />
        ))}
      </div>
    </section>
  );
}
