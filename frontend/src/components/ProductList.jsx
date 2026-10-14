import React from 'react';
import ProductCard from './ProductCard';

export default function ProductList({ products }) {
  if (!products || products.length === 0) return null;

  return (
    <section className="products-section" aria-label="Matching Products">
      <div className="results-header">
        <h2 className="results-title">Matching Products</h2>
        <span className="results-count">
          {products.length} {products.length === 1 ? 'product' : 'products'} found
        </span>
      </div>

      <div className="products-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
