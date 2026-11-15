import os
import time
import requests

from fastapi import APIRouter
from app.config import settings

router = APIRouter(prefix="/models", tags=["models"])

# Curated high-performance models across both Google Gemini and OpenRouter
STATIC = [
    # Google Gemini Direct (Google AI Studio Key)
    {
        "id": "gemini-3.5-flash",
        "name": "Google: Gemini 3.5 Flash (Direct)",
        "provider": "Google",
        "context": 1048576,
        "vision": True,
        "free": True,
        "badge": "⚡ Google Direct (High Free Quota)"
    },
    {
        "id": "gemini-3.5-flash-lite",
        "name": "Google: Gemini 3.5 Flash Lite (Direct)",
        "provider": "Google",
        "context": 1048576,
        "vision": True,
        "free": True,
        "badge": "🚀 Ultra-Fast & High Limits"
    },
    {
        "id": "gemini-3.8-flash",
        "name": "Google: Gemini 3.8 Flash (Preview)",
        "provider": "Google",
        "context": 1048576,
        "vision": True,
        "free": True,
        "badge": "🧠 Frontier Preview (20/day limit)"
    },
    # OpenRouter Models
    {
        "id": "nvidia/nemotron-3.5-super-vl:free",
        "name": "NVIDIA: Nemotron 3.5 Super VL (OpenRouter)",
        "provider": "OpenRouter",
        "context": 1000000,
        "vision": True,
        "free": True,
        "badge": "1M Context & Vision"
    },
    {
        "id": "nvidia/nemotron-3.5-lightning:free",
        "name": "NVIDIA: Nemotron 3.5 Lightning (OpenRouter)",
        "provider": "OpenRouter",
        "context": 1000000,
        "vision": False,
        "free": True,
        "badge": "Ultra-Fast & Stable"
    },
    {
        "id": "cohere/north-mini-code:free",
        "name": "Cohere: North Mini Code (OpenRouter)",
        "provider": "OpenRouter",
        "context": 256000,
        "vision": False,
        "free": True,
        "badge": "Coding Specialist & Refactoring"
    },
    {
        "id": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        "name": "NVIDIA: Nemotron 3 Nano Omni (OpenRouter)",
        "provider": "OpenRouter",
        "context": 256000,
        "vision": False,
        "free": True,
        "badge": "Chain-of-Thought Reasoning"
    },
    {
        "id": "google/gemma-4-31b-it:free",
        "name": "Google: Gemma 4 31B (OpenRouter free pool)",
        "provider": "OpenRouter",
        "context": 262144,
        "vision": False,
        "free": True,
        "badge": "Shared Pool (Rate-Limited Upstream)"
    }
]

_cache: dict = {"at": 0.0, "data": []}


def _live_openrouter() -> list[dict]:
  if _cache["data"] and time.time() - _cache["at"] < 3600:
    return _cache["data"]
  try:
    r = requests.get("https://openrouter.ai/api/v1/models", timeout=8)
    r.raise_for_status()
    out = []

    for m in r.json().get("data", []):
      mid = m.get("id", "")
      if not mid.endswith(":free"):
        continue
      mods = (m.get("architecture") or {}).get("input_modalities") or []
      out.append({
        "id": mid,
        "name": f"{m.get('name', mid)} (OpenRouter)",
        "provider": "OpenRouter",
        "vision": "image" in mods,
        "free": True,
        "context": m.get("context_length")
      })
    if out:
      _cache.update(at=time.time(), data=out)
      return out
  except Exception as e:
    print(f"[MODELS] OpenRouter live fetch failed: {e}")
  return []


@router.get("")
def list_models(live: bool = False):
  models = list(STATIC)
  if live:
    live_models = _live_openrouter()
    if live_models:
      badge_map = {m["id"]: m.get("badge") for m in STATIC}
      seen = {m["id"] for m in STATIC}
      for m in live_models:
        if m["id"] not in seen:
          seen.add(m["id"])
          models.append({
            **m,
            "badge": badge_map.get(m["id"])
          })

  # Mark which keys are available
  has_google = bool(os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"))
  has_openrouter = bool(os.getenv("OPENROUTER_API_KEY"))

  default = "gemini-3.5-flash" if has_google else settings.default_model

  return [
    {
      **m,
      "default": m["id"] == default,
      "available": (m.get("provider") == "Google" and has_google) or (m.get("provider") == "OpenRouter" and has_openrouter)
    }
    for m in models
  ]
