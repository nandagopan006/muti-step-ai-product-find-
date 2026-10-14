
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Sends user product search query to the Django backend.
 * @param {string} message - Natural language search query
 * @returns {Promise<object>} - Result containing { answer, products, search_performed, filters_used, total_results }
 */
export async function searchProducts(message) {
  const cleanMessage = (message || '').trim();

  if (!cleanMessage) {
    throw new Error('Please enter a product search request.');
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/products/search/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: cleanMessage }),
    });
  } catch (networkError) {
    throw new Error(
      'Cannot connect to the server. Please verify the Django backend is running.'
    );
  }

  let result;
  try {
    result = await response.json();
  } catch (parseError) {
    throw new Error('Received an invalid response format from the server.');
  }

  // Handle backend error responses (e.g., 400, 502, 503, 504)
  if (!response.ok || !result.success) {
    const errorMessage =
      result?.error?.message ||
      `Request failed with status ${response.status}. Please try again.`;
    throw new Error(errorMessage);
  }

  return result.data;
}
