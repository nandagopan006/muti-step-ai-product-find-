from unittest.mock import patch, MagicMock
import requests
from django.test import TestCase
from django.conf import settings
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status

from .catalog import PRODUCTS_CATALOG, get_all_products
from .services import search_products, validate_search_filters, ALLOWED_FILTERS
from .ai import (
    SYSTEM_PROMPT,
    SEARCH_PRODUCTS_TOOL,
    send_openrouter_request,
    parse_model_response,
    OpenRouterConfigError,
    OpenRouterTimeoutError,
    OpenRouterAPIError,
    MalformedToolCallError,
)


class BackendConfigurationTests(TestCase):
    """Verifies that Django and Django REST Framework are correctly configured."""

    def setUp(self):
        self.client = APIClient()

    def test_health_check_endpoint(self):
        """GET /api/health/ should return HTTP 200 with service status."""
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("status"), "ok")
        self.assertEqual(response.data.get("service"), "ai-product-finder-backend")

    def test_installed_apps_configuration(self):
        """Ensure rest_framework, corsheaders, and products are in INSTALLED_APPS."""
        self.assertIn("rest_framework", settings.INSTALLED_APPS)
        self.assertIn("corsheaders", settings.INSTALLED_APPS)
        self.assertIn("products", settings.INSTALLED_APPS)

    def test_cors_middleware_configured(self):
        """Ensure CorsMiddleware is positioned at the top of MIDDLEWARE."""
        self.assertEqual(
            settings.MIDDLEWARE[0],
            "corsheaders.middleware.CorsMiddleware",
        )

    def test_cors_allowed_origins_present(self):
        """Ensure CORS origins list includes localhost/Vite frontend development origin."""
        self.assertTrue(len(settings.CORS_ALLOWED_ORIGINS) > 0)
        self.assertIn("http://localhost:5173", settings.CORS_ALLOWED_ORIGINS)


class ProductCatalogAndSearchTests(TestCase):
    """Comprehensive test suite for the deterministic product search engine."""

    def test_search_without_filters_returns_all_products(self):
        """1. Searching without filters should return all catalog items."""
        results = search_products({})
        self.assertEqual(len(results), len(PRODUCTS_CATALOG))

        # None filter should also return all
        results_none = search_products(None)
        self.assertEqual(len(results_none), len(PRODUCTS_CATALOG))

    def test_filter_by_category(self):
        """2. Filtering by category should return only products in that category."""
        results = search_products({"category": "smartphone"})
        self.assertTrue(len(results) > 0)
        for product in results:
            self.assertEqual(product["category"], "smartphone")

    def test_filter_by_brand(self):
        """3. Filtering by brand should return only products of that brand."""
        results = search_products({"brand": "Lenovo"})
        self.assertTrue(len(results) > 0)
        for product in results:
            self.assertEqual(product["brand"], "Lenovo")

    def test_filter_by_max_price(self):
        """4. Filtering by max_price should never return products above that price."""
        max_price = 60000
        results = search_products({"max_price": max_price})
        self.assertTrue(len(results) > 0)
        for product in results:
            self.assertLessEqual(product["price"], max_price)

    def test_filter_by_min_price(self):
        """5. Filtering by min_price should never return products below that price."""
        min_price = 50000
        results = search_products({"min_price": min_price})
        self.assertTrue(len(results) > 0)
        for product in results:
            self.assertGreaterEqual(product["price"], min_price)

    def test_filter_by_price_range(self):
        """6. Filtering by both min_price and max_price."""
        min_p = 40000
        max_p = 60000
        results = search_products({"min_price": min_p, "max_price": max_p})
        self.assertTrue(len(results) > 0)
        for product in results:
            self.assertGreaterEqual(product["price"], min_p)
            self.assertLessEqual(product["price"], max_p)

    def test_filter_by_ram_normalization(self):
        """7. Filtering by RAM should normalize variations like '16 GB', '16gb', '16GB'."""
        results_1 = search_products({"ram": "16GB"})
        results_2 = search_products({"ram": "16 GB"})
        results_3 = search_products({"ram": "16gb"})

        self.assertEqual(len(results_1), len(results_2))
        self.assertEqual(len(results_1), len(results_3))
        self.assertTrue(len(results_1) > 0)

        for product in results_1:
            self.assertIn("16", product["specs"]["ram"])

    def test_filter_by_storage(self):
        """8. Filtering by storage should match SSD capacities correctly."""
        results = search_products({"storage": "512GB"})
        self.assertTrue(len(results) > 0)
        for product in results:
            self.assertIn("512GB", product["specs"]["storage"])

    def test_combined_filters_and_logic(self):
        """9. Combining Brand, Category, Max Price, RAM, and Storage (the canonical prompt example)."""
        # "Find me a Lenovo laptop under 60000 with 16GB RAM and 512GB SSD"
        filters = {
            "brand": "Lenovo",
            "category": "laptop",
            "max_price": 60000,
            "ram": "16GB",
            "storage": "512GB",
        }
        results = search_products(filters)

        # Should match Lenovo IdeaPad Slim 3 (₹54,990) and Lenovo ThinkPad E14 (₹59,990)
        self.assertEqual(len(results), 2)
        for product in results:
            self.assertEqual(product["brand"], "Lenovo")
            self.assertEqual(product["category"], "laptop")
            self.assertLessEqual(product["price"], 60000)
            self.assertIn("16GB", product["specs"]["ram"])
            self.assertIn("512GB", product["specs"]["storage"])

    def test_case_insensitive_matching(self):
        """10. Brand and category matching must be case-insensitive."""
        lower_results = search_products({"brand": "lenovo", "category": "laptop"})
        upper_results = search_products({"brand": "LENOVO", "category": "LAPTOP"})
        mixed_results = search_products({"brand": "LeNoVo", "category": "LaPtOp"})

        self.assertEqual(len(lower_results), len(upper_results))
        self.assertEqual(len(lower_results), len(mixed_results))
        self.assertTrue(len(lower_results) > 0)

    def test_missing_optional_product_specifications(self):
        """11. Products without requested specs (e.g. headphones when filtering for RAM) must not match."""
        # Headphones don't have RAM; searching for headphones with 16GB RAM must return empty list
        results = search_products({"category": "headphones", "ram": "16GB"})
        self.assertEqual(results, [])

    def test_no_products_matching_empty_results(self):
        """12. Filters with no matches in the catalog return an empty list without crashing."""
        results = search_products({"brand": "Apple", "max_price": 20000})
        self.assertEqual(results, [])

    def test_invalid_numeric_values_raise_value_error(self):
        """13. Non-numeric price values must raise ValueError."""
        with self.assertRaises(ValueError):
            search_products({"max_price": "not-a-number"})

    def test_negative_price_raises_value_error(self):
        """14. Negative price values must raise ValueError."""
        with self.assertRaises(ValueError):
            search_products({"min_price": -100})

        with self.assertRaises(ValueError):
            search_products({"max_price": -500})

    def test_min_price_greater_than_max_price_raises_value_error(self):
        """15. min_price > max_price must raise ValueError."""
        with self.assertRaises(ValueError):
            search_products({"min_price": 70000, "max_price": 50000})

    def test_unsupported_filter_raises_value_error(self):
        """16. Unsupported filter keys must be rejected with a helpful ValueError."""
        with self.assertRaises(ValueError) as ctx:
            search_products({"unknown_attribute": "value"})
        self.assertIn("Unsupported search filter", str(ctx.exception))

    def test_catalog_immutability(self):
        """17. Executing searches must never mutate the underlying catalog."""
        original_count = len(PRODUCTS_CATALOG)
        original_price = PRODUCTS_CATALOG[0]["price"]

        results = search_products({"brand": "Lenovo"})
        # Modify the returned dictionary
        if results:
            results[0]["price"] = 999999.0

        # Underlying catalog must retain original count and price
        self.assertEqual(len(PRODUCTS_CATALOG), original_count)
        self.assertEqual(PRODUCTS_CATALOG[0]["price"], original_price)

    def test_results_never_violate_requested_filters(self):
        """18. Guarantees that returned items strictly satisfy all constraints."""
        max_p = 45000
        results = search_products({"category": "laptop", "max_price": max_p})
        for item in results:
            self.assertEqual(item["category"], "laptop")
            self.assertLessEqual(item["price"], max_p)
            self.assertFalse(item["price"] > max_p)


class OpenRouterIntegrationTests(TestCase):
    """Tests for Phase 3 LLM integration, tool definition, and response parsing."""

    def test_tool_schema_matches_supported_filters(self):
        """Tool parameters schema must match the ALLOWED_FILTERS set."""
        properties = SEARCH_PRODUCTS_TOOL["function"]["parameters"]["properties"]
        self.assertEqual(set(properties.keys()), ALLOWED_FILTERS)

    def test_parse_model_response_detects_tool_call(self):
        """Model response with search_products tool call is parsed cleanly."""
        mock_response = {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "tool_calls": [
                            {
                                "id": "call_12345",
                                "type": "function",
                                "function": {
                                    "name": "search_products",
                                    "arguments": '{"brand": "Lenovo", "max_price": 60000, "ram": "16GB"}',
                                },
                            }
                        ],
                    }
                }
            ]
        }
        result = parse_model_response(mock_response)
        self.assertTrue(result["has_tool_call"])
        self.assertEqual(result["tool_call_id"], "call_12345")
        self.assertEqual(result["tool_name"], "search_products")
        self.assertEqual(result["arguments"]["brand"], "Lenovo")
        self.assertEqual(result["arguments"]["max_price"], 60000.0)
        self.assertEqual(result["arguments"]["ram"], "16GB")

    def test_parse_model_response_plain_text(self):
        """Conversational response without tool call returns has_tool_call: False."""
        mock_response = {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "Hello! I can help you search for laptops and phones.",
                    }
                }
            ]
        }
        result = parse_model_response(mock_response)
        self.assertFalse(result["has_tool_call"])
        self.assertEqual(result["content"], "Hello! I can help you search for laptops and phones.")

    def test_parse_model_response_malformed_json(self):
        """Malformed JSON arguments raise MalformedToolCallError."""
        mock_response = {
            "choices": [
                {
                    "message": {
                        "tool_calls": [
                            {
                                "id": "call_1",
                                "function": {
                                    "name": "search_products",
                                    "arguments": '{"brand": "Lenovo", "price": ',
                                },
                            }
                        ]
                    }
                }
            ]
        }
        with self.assertRaises(MalformedToolCallError):
            parse_model_response(mock_response)

    def test_parse_model_response_unexpected_tool_name(self):
        """Unknown tool name raises MalformedToolCallError."""
        mock_response = {
            "choices": [
                {
                    "message": {
                        "tool_calls": [
                            {
                                "id": "call_1",
                                "function": {
                                    "name": "order_food",
                                    "arguments": "{}",
                                },
                            }
                        ]
                    }
                }
            ]
        }
        with self.assertRaises(MalformedToolCallError) as ctx:
            parse_model_response(mock_response)
        self.assertIn("Unexpected tool", str(ctx.exception))

    def test_parse_model_response_unsupported_filter(self):
        """Unsupported filter keys in tool call raise MalformedToolCallError."""
        mock_response = {
            "choices": [
                {
                    "message": {
                        "tool_calls": [
                            {
                                "id": "call_1",
                                "function": {
                                    "name": "search_products",
                                    "arguments": '{"unsupported_spec": "xyz"}',
                                },
                            }
                        ]
                    }
                }
            ]
        }
        with self.assertRaises(MalformedToolCallError):
            parse_model_response(mock_response)

    def test_parse_model_response_invalid_price_range(self):
        """min_price > max_price in tool call raises MalformedToolCallError."""
        mock_response = {
            "choices": [
                {
                    "message": {
                        "tool_calls": [
                            {
                                "id": "call_1",
                                "function": {
                                    "name": "search_products",
                                    "arguments": '{"min_price": 80000, "max_price": 40000}',
                                },
                            }
                        ]
                    }
                }
            ]
        }
        with self.assertRaises(MalformedToolCallError):
            parse_model_response(mock_response)

    def test_parse_model_response_missing_optional_fields(self):
        """Missing optional fields are accepted cleanly."""
        mock_response = {
            "choices": [
                {
                    "message": {
                        "tool_calls": [
                            {
                                "id": "call_1",
                                "function": {
                                    "name": "search_products",
                                    "arguments": '{"brand": "Dell"}',
                                },
                            }
                        ]
                    }
                }
            ]
        }
        result = parse_model_response(mock_response)
        self.assertEqual(result["arguments"], {"brand": "Dell"})

    def test_parse_model_response_invalid_structure(self):
        """Malformed response structure raises OpenRouterAPIError."""
        with self.assertRaises(OpenRouterAPIError):
            parse_model_response({"error": "something went wrong"})

        with self.assertRaises(OpenRouterAPIError):
            parse_model_response({"choices": []})

    def test_send_request_missing_api_key(self):
        """Sending request with empty API key raises OpenRouterConfigError."""
        with self.settings(OPENROUTER_API_KEY=""):
            with self.assertRaises(OpenRouterConfigError):
                send_openrouter_request([{"role": "user", "content": "hi"}])

    @patch("products.ai.requests.post")
    def test_send_request_timeout(self, mock_post):
        """Timeout from requests raises OpenRouterTimeoutError."""
        mock_post.side_effect = requests.exceptions.Timeout("Request timed out")
        with self.settings(OPENROUTER_API_KEY="test-key"):
            with self.assertRaises(OpenRouterTimeoutError):
                send_openrouter_request([{"role": "user", "content": "hi"}])

    @patch("products.ai.requests.post")
    def test_send_request_http_error(self, mock_post):
        """Non-200 HTTP response raises OpenRouterAPIError."""
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized: Invalid API key"
        mock_post.return_value = mock_response

        with self.settings(OPENROUTER_API_KEY="test-key"):
            with self.assertRaises(OpenRouterAPIError) as ctx:
                send_openrouter_request([{"role": "user", "content": "hi"}])
            self.assertIn("401", str(ctx.exception))

    @patch("products.ai.requests.post")
    def test_send_request_success(self, mock_post):
        """Successful 200 response returns parsed json."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"choices": [{"message": {"content": "ok"}}]}
        mock_post.return_value = mock_response

        with self.settings(OPENROUTER_API_KEY="test-key"):
            result = send_openrouter_request([{"role": "user", "content": "hi"}])
            self.assertEqual(result["choices"][0]["message"]["content"], "ok")


class ProductSearchAPITests(TestCase):
    """Essential API tests for POST /api/products/search/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/products/search/"

    def test_missing_message_returns_400(self):
        """Request without message field returns HTTP 400."""
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])

    def test_empty_message_returns_400(self):
        """Whitespace-only or empty message returns HTTP 400."""
        response = self.client.post(self.url, {"message": "   "}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])

    def test_overly_long_message_returns_400(self):
        """Message exceeding 4000 characters returns HTTP 400."""
        long_message = "a" * 4001
        response = self.client.post(self.url, {"message": long_message}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])

    @patch("products.views.run_product_search_workflow")
    def test_successful_search_returns_200(self, mock_workflow):
        """Valid message returns HTTP 200 with formatted data contract."""
        mock_workflow.return_value = {
            "answer": "Here are 2 matching laptops.",
            "products": [{"id": 1, "title": "Test Laptop"}],
            "search_performed": True,
            "filters_used": {"category": "laptop"},
        }
        response = self.client.post(self.url, {"message": "Find a laptop"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["answer"], "Here are 2 matching laptops.")
        self.assertEqual(len(response.data["data"]["products"]), 1)
        self.assertEqual(response.data["data"]["total_results"], 1)
        self.assertTrue(response.data["data"]["search_performed"])

    @patch("products.views.run_product_search_workflow")
    def test_empty_results_handled_honestly(self, mock_workflow):
        """When no products match, response reflects 0 results honestly."""
        mock_workflow.return_value = {
            "answer": "No laptops found matching your criteria.",
            "products": [],
            "search_performed": True,
            "filters_used": {"max_price": 5000},
        }
        response = self.client.post(self.url, {"message": "laptop under 5000"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(len(response.data["data"]["products"]), 0)
        self.assertEqual(response.data["data"]["total_results"], 0)

    @patch("products.views.run_product_search_workflow")
    def test_provider_timeout_returns_504(self, mock_workflow):
        """OpenRouter timeout returns HTTP 504 Gateway Timeout."""
        mock_workflow.side_effect = OpenRouterTimeoutError("Timed out")
        response = self.client.post(self.url, {"message": "test query"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_504_GATEWAY_TIMEOUT)
        self.assertFalse(response.data["success"])

    @patch("products.views.run_product_search_workflow")
    def test_provider_api_error_returns_502(self, mock_workflow):
        """Upstream AI provider error returns HTTP 502 Bad Gateway."""
        mock_workflow.side_effect = OpenRouterAPIError("Upstream 500")
        response = self.client.post(self.url, {"message": "test query"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertFalse(response.data["success"])

    @patch("products.views.run_product_search_workflow")
    def test_missing_config_returns_503(self, mock_workflow):
        """Missing API key returns HTTP 503 Service Unavailable."""
        mock_workflow.side_effect = OpenRouterConfigError("Missing key")
        response = self.client.post(self.url, {"message": "test query"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertFalse(response.data["success"])

    @patch("products.views.run_product_search_workflow")
    def test_unexpected_exception_returns_500(self, mock_workflow):
        """Unexpected internal exception returns safe HTTP 500 without leaking details."""
        mock_workflow.side_effect = RuntimeError("Database crashed unexpectedly")
        response = self.client.post(self.url, {"message": "test query"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["error"]["message"], "An unexpected error occurred. Please try again.")


class SearchCachingTests(TestCase):
    """Verifies that search queries are correctly cached to reduce latency and API calls."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/products/search/"
        cache.clear()

    def tearDown(self):
        cache.clear()

    @patch("products.views.run_product_search_workflow")
    def test_first_search_is_cache_miss_and_sets_cache(self, mock_workflow):
        """First search request should miss cache, execute workflow, and return cached=False."""
        mock_workflow.return_value = {
            "answer": "Here is a laptop.",
            "products": [{"id": "p1", "name": "Laptop Pro", "price": 50000}],
            "search_performed": True,
            "filters_used": {"category": "laptops"},
        }

        response = self.client.post(self.url, {"message": "best laptop"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertFalse(response.data["data"]["cached"])
        self.assertEqual(mock_workflow.call_count, 1)

    @patch("products.views.run_product_search_workflow")
    def test_subsequent_identical_search_hits_cache(self, mock_workflow):
        """Subsequent search with identical query hits cache and avoids re-executing workflow."""
        mock_workflow.return_value = {
            "answer": "Here is a laptop.",
            "products": [{"id": "p1", "name": "Laptop Pro", "price": 50000}],
            "search_performed": True,
            "filters_used": {"category": "laptops"},
        }

        # First request
        resp1 = self.client.post(self.url, {"message": "best laptop"}, format="json")
        self.assertFalse(resp1.data["data"]["cached"])
        self.assertEqual(mock_workflow.call_count, 1)

        # Second request (identical query)
        resp2 = self.client.post(self.url, {"message": "best laptop"}, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.data["success"])
        self.assertTrue(resp2.data["data"]["cached"])
        self.assertEqual(resp2.data["data"]["answer"], "Here is a laptop.")
        self.assertEqual(len(resp2.data["data"]["products"]), 1)
        # Workflow was NOT called a second time
        self.assertEqual(mock_workflow.call_count, 1)

    @patch("products.views.run_product_search_workflow")
    def test_cache_normalizes_case_and_whitespace(self, mock_workflow):
        """Cache keys should normalize surrounding whitespace and casing."""
        mock_workflow.return_value = {
            "answer": "Smartphone options.",
            "products": [],
            "search_performed": True,
            "filters_used": {},
        }

        # First request: "  Budget Phone  "
        self.client.post(self.url, {"message": "  Budget Phone  "}, format="json")
        self.assertEqual(mock_workflow.call_count, 1)

        # Second request: "budget phone" (lowercase, no trailing spaces)
        resp2 = self.client.post(self.url, {"message": "budget phone"}, format="json")
        self.assertTrue(resp2.data["data"]["cached"])
        self.assertEqual(mock_workflow.call_count, 1)

    @patch("products.views.run_product_search_workflow")
    def test_failed_search_does_not_cache(self, mock_workflow):
        """Errors should not be cached, allowing subsequent retries to attempt workflow execution."""
        mock_workflow.side_effect = OpenRouterTimeoutError("Timed out")

        # Failed request
        resp1 = self.client.post(self.url, {"message": "fail query"}, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_504_GATEWAY_TIMEOUT)

        # Fix mock for retry
        mock_workflow.side_effect = None
        mock_workflow.return_value = {
            "answer": "Recovered response",
            "products": [],
            "search_performed": False,
            "filters_used": {},
        }

        # Second request should not be cached
        resp2 = self.client.post(self.url, {"message": "fail query"}, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertFalse(resp2.data["data"]["cached"])


