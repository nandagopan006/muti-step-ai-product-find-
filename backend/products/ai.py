import json
import requests
from django.conf import settings
from .services import validate_search_filters

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# custom error ahn  use chanyn
class OpenRouterError(Exception): pass
class OpenRouterConfigError(OpenRouterError): pass
class OpenRouterTimeoutError(OpenRouterError): pass
class OpenRouterAPIError(OpenRouterError): pass
class MalformedToolCallError(OpenRouterError): pass


SYSTEM_PROMPT = """You are a dedicated AI Product Finder assistant for an electronics catalog.
Your ONLY role is to help users find and compare electronics (laptops, smartphones, headphones).

Rules:
1. When a user asks to find, search, or recommend products, extract their search filters and call `search_products`.
2. Supported filters: category, brand, min_price, max_price, ram, storage. Prices are in Indian Rupees (INR ₹).
3. STRICT OFF-TOPIC RULE: If the user asks an unrelated, non-shopping, or general knowledge question (e.g. programming like "what is python?", science, history, trivia, recipes, etc.), do NOT answer the question. Politely decline and tell the user that you are only able to help them find electronic products (laptops, smartphones, and headphones) in our catalog.
4. If the user greets you (e.g. "hi", "hello"), reply politely and invite them to search for products.
5. Never invent products or prices.
6. When products are found, provide a brief 1-2 sentence conversational summary. Do NOT repeat long bulleted spec lists, raw URLs, or markdown images, as visual cards appear below.
"""

SEARCH_PRODUCTS_TOOL = {
    "type": "function",
    "function": {
        "name": "search_products",
        "description": "Search the product catalog for electronics using filters like brand, price, and specs.",
        "parameters": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "description": "e.g. laptop, smartphone, headphones"},
                "brand": {"type": "string", "description": "e.g. Lenovo, Dell, HP, Apple, Samsung"},
                "min_price": {"type": "number", "description": "Minimum budget in INR"},
                "max_price": {"type": "number", "description": "Maximum budget in INR"},
                "ram": {"type": "string", "description": "RAM size like 8GB, 16GB"},
                "storage": {"type": "string", "description": "Storage like 512GB, 1TB"},
            },
            "additionalProperties": False,
        },
    },
}


def send_openrouter_request(messages, tools=None, timeout=20.0):
    """Sends a chat request to OpenRouter using requests."""
    
    api_key = getattr(settings, "OPENROUTER_API_KEY", "")
    model = getattr(settings, "OPENROUTER_MODEL", "openai/gpt-4o-mini")

    if not api_key:
        raise OpenRouterConfigError("Missing OPENROUTER_API_KEY. Add it to your .env file.")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "AI Product Finder",
    }

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 800,
    }

    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"

    try:
        response = requests.post(OPENROUTER_URL, json=payload, headers=headers, timeout=timeout)
    except requests.exceptions.Timeout:
        raise OpenRouterTimeoutError("OpenRouter request timed out.")
    except requests.exceptions.RequestException as e:
        raise OpenRouterAPIError(f"Network error connecting to OpenRouter: {e}")

    if response.status_code != 200:
        raise OpenRouterAPIError(f"OpenRouter error ({response.status_code}): {response.text}")

    try:
        return response.json()
    except ValueError:
        raise OpenRouterAPIError("OpenRouter returned invalid JSON.")


def parse_model_response(response_data):
    """
    Reads the AI's response to see if it answered with text
    or requested to search products with filters.
    """
    # Check if the response from OpenRouter vild or not 
    if not isinstance(response_data, dict) or not response_data.get("choices"):
        raise OpenRouterAPIError("Invalid or empty response received from OpenRouter.")

    message = response_data["choices"][0].get("message", {})
    tool_calls = message.get("tool_calls")

    #If the AI just answered with normal text /no search tool requested)
    if not tool_calls:
        return {
            "has_tool_call": False,
            "content": message.get("content", ""),
            "raw_message": message,
        }

    #The AI wants to search! Extract the tool call details
    tool = tool_calls[0]
    tool_id = tool.get("id")
    function_data = tool.get("function", {})
    tool_name = function_data.get("name")
    raw_arguments = function_data.get("arguments", "{}")

    
    if tool_name != "search_products":
        raise MalformedToolCallError(f"Unexpected tool called: '{tool_name}'. Expected 'search_products'.")

    #Convert JSON arguments string into a Python dictionary
    try:
        if isinstance(raw_arguments, str):
            parsed_arguments = json.loads(raw_arguments)
        else:
            parsed_arguments = raw_arguments
    except json.JSONDecodeError as error:
        raise MalformedToolCallError(f"Could not read tool arguments: {error}")

   
    try:
        valid_filters = validate_search_filters(parsed_arguments)
    except ValueError as error:
        raise MalformedToolCallError(f"Invalid search filter: {error}")

 
    return {
        "has_tool_call": True,
        "tool_call_id": tool_id,
        "tool_name": tool_name,
        "arguments": valid_filters,
        "raw_message": message,
    }
