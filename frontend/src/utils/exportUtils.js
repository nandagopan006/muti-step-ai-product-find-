/**
 * Utility functions for exporting search results and sharing AI summaries.
 */

function sanitizeForCSV(field) {
  if (field === null || field === undefined) return '""';
  const stringified = String(field).replace(/"/g, '""');
  return `"${stringified}"`;
}

/**
 * Exports products array to a downloadable CSV file.
 * @param {Array} products - List of product objects
 * @param {string} query - The search query for the filename
 */
export function exportProductsToCSV(products, query = 'search') {
  if (!products || products.length === 0) return;

  const headers = [
    'ID',
    'Name',
    'Category',
    'Price (INR)',
    'Rating',
    'Reviews Count',
    'In Stock',
    'Description',
    'Key Specifications',
  ];

  const rows = products.map((p) => {
    const specsString = p.specs
      ? Object.entries(p.specs)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ')
      : '';

    return [
      sanitizeForCSV(p.id),
      sanitizeForCSV(p.name),
      sanitizeForCSV(p.category),
      p.price || 0,
      p.rating || 0,
      p.reviews_count || 0,
      p.in_stock ? 'Yes' : 'No',
      sanitizeForCSV(p.description),
      sanitizeForCSV(specsString),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const cleanName = query.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) || 'products';
  const filename = `ai-products-${cleanName}-${Date.now()}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies a markdown summary of search results to the clipboard.
 * @param {string} query
 * @param {string} answer
 * @param {Array} products
 * @returns {Promise<boolean>}
 */
export async function copySearchSummaryToClipboard(query, answer, products = []) {
  const cleanAnswer = (answer || '').replace(/!\[.*?\]\(.*?\)/g, '').trim();

  let summary = `🔍 **AI Product Search:** "${query || 'Recommendations'}"\n\n`;

  if (cleanAnswer) {
    summary += `✨ **AI Recommendation:**\n${cleanAnswer}\n\n`;
  }

  if (products && products.length > 0) {
    summary += `📦 **Top Matched Products (${products.length}):**\n`;
    products.slice(0, 5).forEach((p, idx) => {
      const formattedPrice = p.price ? `₹${p.price.toLocaleString('en-IN')}` : 'N/A';
      summary += `${idx + 1}. **${p.name}** — ${formattedPrice} | ⭐ ${p.rating || 'N/A'} (${p.reviews_count || 0} reviews)\n`;
      if (p.specs && Object.keys(p.specs).length > 0) {
        const topSpecs = Object.entries(p.specs)
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        summary += `   • Specs: ${topSpecs}\n`;
      }
    });
  }

  summary += `\n— Shared via AI Product Finder`;

  try {
    await navigator.clipboard.writeText(summary);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = summary;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}
