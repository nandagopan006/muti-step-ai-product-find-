import json
from .ai import (
    SYSTEM_PROMPT,
    SEARCH_PRODUCTS_TOOL,
    send_openrouter_request,
    parse_model_response,
    OpenRouterError,
    MalformedToolCallError,
)
from .services import search_products

MAX_TOOL_ROUNDS = 1


def run_product_search_workflow(user_query):
    """
    Sends the user's query to the AI, runs the product search if the AI requests it,
    and returns the final answer with the matching products.
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_query},
    ]

    search_performed = False
    products_found = []
    filters_used = {}

    for round_number in range(MAX_TOOL_ROUNDS + 1):

        tools = [SEARCH_PRODUCTS_TOOL] if round_number < MAX_TOOL_ROUNDS else None
        response_data = send_openrouter_request(messages, tools=tools)
        parsed = parse_model_response(response_data)

       
        if not parsed["has_tool_call"]:
            final_answer = parsed["content"] or "I couldn't generate a response. Please try again."
            return {
                "answer": final_answer,
                "products": products_found,
                "search_performed": search_performed,
                "filters_used": filters_used,
            }

        # AI kept requesting tools past the allowed limit — stop safely
        if round_number >= MAX_TOOL_ROUNDS:
            return {
                "answer": "I had trouble completing your search. Please try rephrasing your query.",
                "products": [],
                "search_performed": search_performed,
                "filters_used": filters_used,
            }

        # AI requested search — extract filters and run the actual search
        tool_call_id = parsed["tool_call_id"]
        filters_used = parsed["arguments"]
        products_found = search_products(filters_used)
        search_performed = True

        # Add the AI's tool call and our search results to the conversation
      
        simplified_products = [
            {
                "title": p.get("title"),
                "brand": p.get("brand"),
                "price": p.get("price"),
                "specs": p.get("specs"),
            }
            for p in products_found[:5]
        ]

        messages.append(parsed["raw_message"])
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": json.dumps(simplified_products, ensure_ascii=False),
        })

    return {
        "answer": "Something went wrong. Please try again.",
        "products": products_found,
        "search_performed": search_performed,
        "filters_used": filters_used,
    }
