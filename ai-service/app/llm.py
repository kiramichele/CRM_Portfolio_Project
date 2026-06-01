"""Thin Anthropic wrapper: forced tool-use for reliable structured JSON output.

We use tool use (not the response-format API) because the user wants guaranteed
JSON and tool input_schema is the most permissive, battle-tested path. The shared
system prompt is sent as a cache-control'd block (stable prefix first, volatile
user input last) so repeated calls with the same prompt can hit the cache once
the prefix is large enough.
"""

from __future__ import annotations

import json
from typing import Any

import anthropic
from fastapi import HTTPException

from .config import settings

_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


def structured(
    *,
    system: str,
    user: str,
    schema: dict[str, Any],
    tool_name: str,
    model: str,
    max_tokens: int = 1024,
) -> dict[str, Any]:
    """Call Claude and force it to return JSON matching `schema` via tool use."""
    if not settings.anthropic_api_key:
        raise HTTPException(503, "AI service is not configured (missing ANTHROPIC_API_KEY).")

    try:
        resp = _client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=[
                {
                    "type": "text",
                    "text": system,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            tools=[
                {
                    "name": tool_name,
                    "description": f"Return the {tool_name.replace('_', ' ')} result.",
                    "input_schema": schema,
                }
            ],
            tool_choice={"type": "tool", "name": tool_name},
            messages=[{"role": "user", "content": user}],
        )
    except anthropic.RateLimitError:
        raise HTTPException(429, "AI service is rate limited — try again shortly.")
    except anthropic.APIStatusError as e:  # 4xx/5xx from the API
        raise HTTPException(502, f"AI provider error: {e.message}")
    except anthropic.APIError as e:
        raise HTTPException(502, f"AI provider error: {e}")

    for block in resp.content:
        if block.type == "tool_use":
            return dict(block.input)  # already-parsed JSON object

    raise HTTPException(502, "Model did not return structured output.")


def as_json(value: Any) -> str:
    """Stable, compact JSON for embedding data into a prompt."""
    return json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)
