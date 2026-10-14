import React from 'react';

export default function EmptyState() {
  return (
    <div className="empty-state" role="status">
      <span className="empty-state-icon" aria-hidden="true">
        🔍
      </span>
      <h3 className="empty-state-title">No Matching Products Found</h3>
      <p className="empty-state-description">
        We searched our catalog but couldn't find products matching all your criteria.
        Try broadening your budget, choosing a different brand, or asking a more general question.
      </p>
    </div>
  );
}
