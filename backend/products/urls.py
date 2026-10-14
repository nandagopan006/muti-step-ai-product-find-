from django.urls import path
from .views import HealthCheckView, ProductSearchView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health_check"),
    path("products/search/", ProductSearchView.as_view(), name="product_search"),
]
