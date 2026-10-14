import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import AiAnswer from './components/AiAnswer';
import ProductList from './components/ProductList';
import EmptyState from './components/EmptyState';
import ErrorAlert from './components/ErrorAlert';
import ProductDetailModal from './components/ProductDetailModal';
import FavoritesModal from './components/FavoritesModal';
import CompareBar from './components/CompareBar';
import ComparisonModal from './components/ComparisonModal';
import ChatHistory from './components/ChatHistory';
import Toast from './components/Toast';
import { searchProducts } from './services/api';

const RECENT_SEARCHES_KEY = 'ai_recent_searches';
const FAVORITES_KEY = 'ai_favorite_products';
const MAX_COMPARE = 4;

export default function App() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [lastQuery, setLastQuery] = useState('');

  // Modals & User Preferences
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

  // Product Comparison state
  const [comparedProducts, setComparedProducts] = useState([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const comparedProductIds = new Set(comparedProducts.map((p) => p.id));

  // Toast notification state
  const [toastMessage, setToastMessage] = useState('');

  // Conversation history (session-based, resets on refresh)
  const [conversations, setConversations] = useState([]);

  // Recent Searches state
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Favorites state
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep a Set of favorite IDs for quick O(1) lookup
  const favoriteIds = new Set(favorites.map((p) => p.id));

  // Sync favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.error('Failed to save favorites to localStorage', e);
    }
  }, [favorites]);

  // Sync recent searches to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
    } catch (e) {
      console.error('Failed to save recent searches', e);
    }
  }, [recentSearches]);

  const addRecentSearch = (searchText) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (item) => item.toLowerCase() !== searchText.toLowerCase()
      );
      return [searchText, ...filtered].slice(0, 5);
    });
  };

  const handleClearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const handleToggleFavorite = (product) => {
    setFavorites((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      } else {
        return [product, ...prev];
      }
    });
  };

  const handleRemoveFavorite = (productId) => {
    setFavorites((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleClearAllFavorites = () => {
    setFavorites([]);
  };

  // --- Comparison Handlers ---
  const handleToggleCompare = (product) => {
    setComparedProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      if (prev.length >= MAX_COMPARE) {
        return prev; // Silently cap at max
      }
      return [...prev, product];
    });
  };

  const handleRemoveFromCompare = (productId) => {
    setComparedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleClearCompare = () => {
    setComparedProducts([]);
  };

  // Executes the search against the backend API
  const handleSearch = async (queryText) => {
    const textToSearch = (queryText || query).trim();

    if (!textToSearch) {
      setValidationError('Please enter a product search request.');
      return;
    }

    setValidationError('');
    setErrorMessage('');
    setSearchResult(null);
    setIsLoading(true);
    setLastQuery(textToSearch);
    addRecentSearch(textToSearch);

    try {
      const data = await searchProducts(textToSearch);
      setSearchResult(data);

      // Append this turn to conversation history
      setConversations((prev) => [
        ...prev,
        {
          query: textToSearch,
          answer: data.answer,
          filtersUsed: data.filters_used || {},
          productCount: data.products?.length || 0,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
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
      <Header
        favoritesCount={favorites.length}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
      />

      <SearchBar
        query={query}
        setQuery={setQuery}
        onSearch={handleSearch}
        isLoading={isLoading}
        validationError={validationError}
        setValidationError={setValidationError}
        recentSearches={recentSearches}
        onClearRecentSearches={handleClearRecentSearches}
      />

      {errorMessage && (
        <ErrorAlert message={errorMessage} onRetry={handleRetry} />
      )}

      {isLoading && (
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">
            Consulting AI & checking catalog specifications...
          </p>
        </div>
      )}

      {/* Previous conversation turns */}
      {conversations.length > 1 && (
        <ChatHistory
          conversations={conversations.slice(0, -1)}
          onClear={() => setConversations((prev) => prev.slice(-1))}
          onSelectQuery={(q) => {
            setQuery(q);
            handleSearch(q);
          }}
        />
      )}

      {searchResult && (
        <>
          <AiAnswer
            answer={searchResult.answer}
            filtersUsed={searchResult.filters_used}
            searchPerformed={searchResult.search_performed}
            cached={searchResult.cached}
          />

          <ProductList
            products={searchResult.products}
            onOpenDetails={(p) => setSelectedProduct(p)}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            comparedProductIds={comparedProductIds}
            onToggleCompare={handleToggleCompare}
            query={lastQuery || query}
            answer={searchResult.answer}
            onToast={(msg) => setToastMessage(msg)}
          />
        </>
      )}

      {!isLoading && !searchResult && !errorMessage && <EmptyState />}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          isFavorite={favoriteIds.has(selectedProduct.id)}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* Favorites Modal / Drawer */}
      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favorites}
        onRemoveFavorite={handleRemoveFavorite}
        onClearAll={handleClearAllFavorites}
        onSelectProduct={(p) => setSelectedProduct(p)}
      />

      {/* Floating Compare Bar */}
      <CompareBar
        comparedProducts={comparedProducts}
        onOpenModal={() => setIsComparisonOpen(true)}
        onRemoveItem={handleRemoveFromCompare}
        onClearAll={handleClearCompare}
      />

      {/* Side-by-Side Comparison Modal */}
      <ComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        products={comparedProducts}
        onRemoveProduct={handleRemoveFromCompare}
        onSelectProduct={(p) => {
          setIsComparisonOpen(false);
          setSelectedProduct(p);
        }}
      />

      {/* Toast Notifications */}
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </main>
  );
}
