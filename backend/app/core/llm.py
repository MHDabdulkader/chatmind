import os
from langchain_openrouter import ChatOpenRouter
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings


def get_model(slug: str | None = None):
  slug = slug or settings.default_model

  # Route to Google Gemini if model is a Gemini variant
  if slug.startswith("gemini-") or slug.startswith("models/gemini"):
    google_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    clean_model = slug.replace("models/", "")
    return ChatGoogleGenerativeAI(
      model=clean_model,
      google_api_key=google_key,
      temperature=0.3,
      max_output_tokens=2048,
      max_retries=1
    )

  # Default to OpenRouter
  return ChatOpenRouter(
    model=slug,
    max_tokens=2048,
    temperature=0.3,
    max_retries=1
  )
