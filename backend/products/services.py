from .catalog import get_all_products

ALLOWED_FILTERS = {
    "category",
    "brand",
    "min_price",
    "max_price",
    "ram",
    "storage",
}


def clean_text(value):
    """Lowercase and remove extra spaces."""
    if not value:
        return ""
    return str(value).strip().lower()


def extract_number(value):
    """Extract digits from a string. Example: '16 GB' -> 16."""
    if value is None:
        return None
    digits = "".join(char for char in str(value) if char.isdigit())
    return int(digits) if digits else None


def validate_search_filters(filters):
    """Validate user filters before searching."""
    if not filters:
        return {}

    if not isinstance(filters, dict):
        raise ValueError("Filters must be a dictionary.")

    clean_filters = {}

    for key, value in filters.items():
        if key not in ALLOWED_FILTERS:
            allowed = ", ".join(sorted(ALLOWED_FILTERS))
            raise ValueError(f"Unsupported search filter '{key}'. Allowed filters: {allowed}")

        if value is None or (isinstance(value, str) and value.strip() == ""):
            continue

        clean_filters[key] = value

    if "min_price" in clean_filters:
        try:
            min_p = float(clean_filters["min_price"])
        except (ValueError, TypeError):
            raise ValueError("Invalid min_price: price must be a valid number.")

        if min_p < 0:
            raise ValueError("Minimum price cannot be negative.")
        clean_filters["min_price"] = min_p

    if "max_price" in clean_filters:
        try:
            max_p = float(clean_filters["max_price"])
        except (ValueError, TypeError):
            raise ValueError("Invalid max_price: price must be a valid number.")

        if max_p < 0:
            raise ValueError("Maximum price cannot be negative.")
        clean_filters["max_price"] = max_p

    if "min_price" in clean_filters and "max_price" in clean_filters:
        if clean_filters["min_price"] > clean_filters["max_price"]:
            raise ValueError("Minimum price cannot be greater than maximum price.")

    return clean_filters


def matches_ram(product_specs, requested_ram):
    """Check if product RAM matches the requested RAM number (e.g. 16)."""
    product_ram = product_specs.get("ram")
    if not product_ram:
        return False

    prod_num = extract_number(product_ram)
    req_num = extract_number(requested_ram)

    if prod_num is None or req_num is None:
        return False

    return prod_num == req_num


def matches_storage(product_specs, requested_storage):
    """Check if product storage matches the requested storage capacity."""
    product_storage = product_specs.get("storage")
    if not product_storage:
        return False

    # Example: "512 GB SSD" -> "512gbssd", "512GB" -> "512gb"
    prod_clean = clean_text(product_storage).replace(" ", "")
    req_clean = clean_text(requested_storage).replace(" ", "").replace("ssd", "")

    return req_clean in prod_clean


def search_products(filters=None, catalog=None, limit=None):
    """Search products using simple AND filtering."""
    valid_filters = validate_search_filters(filters)

    products = catalog if catalog is not None else get_all_products()

    if not valid_filters:
        return products[:limit] if limit else products

    results = []

    for product in products:
        specs = product.get("specs", {})

        if "category" in valid_filters:
            if clean_text(product.get("category")) != clean_text(valid_filters["category"]):
                continue

        if "brand" in valid_filters:
            if clean_text(product.get("brand")) != clean_text(valid_filters["brand"]):
                continue

        if "min_price" in valid_filters:
            price = product.get("price")
            if price is None or price < valid_filters["min_price"]:
                continue

        if "max_price" in valid_filters:
            price = product.get("price")
            if price is None or price > valid_filters["max_price"]:
                continue

        if "ram" in valid_filters:
            if not matches_ram(specs, valid_filters["ram"]):
                continue

        if "storage" in valid_filters:
            if not matches_storage(specs, valid_filters["storage"]):
                continue

        results.append(product)

    if limit is not None and limit > 0:
        return results[:limit]

    return results
