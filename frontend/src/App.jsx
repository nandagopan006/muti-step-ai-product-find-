import React, { useState } from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import AiAnswer from './components/AiAnswer';
import ProductList from './components/ProductList';
import EmptyState from './components/EmptyState';
import ErrorAlert from './components/ErrorAlert';
import { searchProducts } from './services/api';

export default function App() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [lastQuery, setLastQuery] = useState('');

  // Executes the search against the backend API
  const handleSearch = async (queryText) => {
    const textToSearch = (queryText || query).trim();

    if (!textToSearch) {
      setValidationError('Please enter a product search request.');
      return;
    }

    setValidationError('');
    setErrorMessage('');
    setSearchResult(null); // Clear previous results to avoid confusing the user
    setIsLoading(true);
    setLastQuery(textToSearch);

    try {
      const data = await searchProducts(textToSearch);
      setSearchResult(data);
    } catch (err) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastQuery) {
      handleSearch(lastQuery);
    }
  };

  return (
    <main className="app-container">
      <Header />

      <SearchBar
        query={query}
        setQuery={setQuery}
        onSearch={handleSearch}
        isLoading={isLoading}
        validationError={validationError}
        setValidationError={setValidationError}
      />

      {/* Error Alert with Retry button */}
      {errorMessage && (
        <ErrorAlert message={errorMessage} onRetry={handleRetry} />
      )}

      {/* Loading state indicator */}
      {isLoading && (
        <div className="loading-indicator" role="status">
          <div className="spinner" />
          <p className="loading-text">Analyzing your request with AI...</p>
          <span className="loading-subtext">
            Filtering product catalog and formulating recommendations
          </span>
        </div>
      )}

      {/* Search results */}
      {!isLoading && searchResult && (
        <>
          <AiAnswer
            answer={searchResult.answer}
            filtersUsed={searchResult.filters_used}
            searchPerformed={searchResult.search_performed}
          />

          {searchResult.products && searchResult.products.length > 0 ? (
            <ProductList products={searchResult.products} />
          ) : (
            searchResult.search_performed && <EmptyState />
          )}
        </>
      )}
    </main>
  );
}
