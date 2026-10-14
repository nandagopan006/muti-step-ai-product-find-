import hashlib
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .serializers import ProductSearchSerializer
from .workflow import run_product_search_workflow
from .ai import (
    OpenRouterConfigError,
    OpenRouterTimeoutError,
    OpenRouterAPIError,
    MalformedToolCallError,
)

SEARCH_CACHE_TTL = 600  # 10 minutes cache duration


def get_search_cache_key(query: str) -> str:
    """Generate a deterministic cache key for a search query."""
    normalized = query.strip().lower()
    hashed = hashlib.sha256(normalized.encode('utf-8')).hexdigest()
    return f"search_cache:{hashed}"


class HealthCheckView(APIView):
    def get(self, request):
        return Response(
            {
                "status": "ok",
                "service": "ai-product-finder-backend",
                "version": "1.0.0",
            },
            status=status.HTTP_200_OK,
        )


class ProductSearchView(APIView):
    def post(self, request):
        serializer = ProductSearchSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "error": {
                        "message": "Invalid request data.",
                        "details": serializer.errors,
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_message = serializer.validated_data["message"]
        cache_key = get_search_cache_key(user_message)

        # Check in-memory cache first
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            products = cached_result.get("products", [])
            return Response(
                {
                    "success": True,
                    "data": {
                        "answer": cached_result.get("answer", ""),
                        "products": products,
                        "search_performed": cached_result.get("search_performed", False),
                        "filters_used": cached_result.get("filters_used", {}),
                        "total_results": len(products),
                        "cached": True,
                    },
                },
                status=status.HTTP_200_OK,
            )

        # Run the AI workflow
        try:
            workflow_result = run_product_search_workflow(user_message)

        except OpenRouterConfigError:
            return Response(
                {
                    "success": False,
                    "error": {
                        "message": "AI service is not configured. Please contact support.",
                    },
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except OpenRouterTimeoutError:
            return Response(
                {
                    "success": False,
                    "error": {
                        "message": "The AI service timed out. Please try again in a moment.",
                    },
                },
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )

        except (OpenRouterAPIError, MalformedToolCallError):
            return Response(
                {
                    "success": False,
                    "error": {
                        "message": "An error occurred with the AI provider. Please try again.",
                    },
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except Exception:
            return Response(
                {
                    "success": False,
                    "error": {
                        "message": "An unexpected error occurred. Please try again.",
                    },
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Cache the successful workflow result
        cache.set(cache_key, workflow_result, timeout=SEARCH_CACHE_TTL)

        products = workflow_result.get("products", [])

        return Response(
            {
                "success": True,
                "data": {
                    "answer": workflow_result.get("answer", ""),
                    "products": products,
                    "search_performed": workflow_result.get("search_performed", False),
                    "filters_used": workflow_result.get("filters_used", {}),
                    "total_results": len(products),
                    "cached": False,
                },
            },
            status=status.HTTP_200_OK,
        )
