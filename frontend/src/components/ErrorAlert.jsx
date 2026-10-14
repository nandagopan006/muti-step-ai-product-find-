import React from 'react';

export default function ErrorAlert({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="error-alert" role="alert">
      <div className="error-content">
        <span aria-hidden="true">⚠️</span>
        <span className="error-title">{message}</span>
      </div>
      {onRetry && (
        <button type="button" className="error-retry-btn" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
