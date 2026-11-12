from langchain_openrouter import ChatOpenRouter

from app.config import settings


def get_model(slug: str | None = None) -> ChatOpenRouter:
  return ChatOpenRouter(
    model = slug or settings.default_model,
    max_tokens = 2048,
    temperature = 0.3
  )

