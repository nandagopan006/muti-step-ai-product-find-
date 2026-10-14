import React from 'react';

export default function Header() {
  return (
    <header className="app-header">
      <div className="brand-badge">
        <span className="brand-badge-dot" />
        Multi-Step AI Product Search
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
