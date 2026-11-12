from langchain.agents import create_agent
from langchain.agents.middleware import ModelRetryMiddleware, ToolRetryMiddleware, ModelCallLimitMiddleware
from langgraph.checkpoint.memory import InMemorySaver

from app.config import settings
from app.core.llm import get_model
from app.core.tools import ALL_TOOLS
from app.core.context import ChatContext

SYSTEM_PROMPT = (
    "You are a helpful research assistant. "
    "For questions that may relate to the user's files, call search_docs first. "
    "If the documents don't contain the answer, or the question needs current or "
    "public information, call web_search, then read_webpage on the best result. "
    "State which source you used (document name or URL). "
    "If you can't find it anywhere, say you don't know. Never invent facts."
)


checkpointer = InMemorySaver()

_agents: dict[str, object] = {}

def get_agent(slug: str|None=None):
  slug = slug or settings.default_model
  if slug not in _agents:
    print(f"[AGENT] building agent for {slug}")
    _agents[slug] = create_agent(
      get_model(slug),
      tools=ALL_TOOLS,
      system_prompt=SYSTEM_PROMPT,
      context_schema=ChatContext,
      middleware=[
        ModelRetryMiddleware(max_retries=3),
        ToolRetryMiddleware(max_retries=2),
        ModelCallLimitMiddleware(run_limit=8, exit_behavior="end")
      ],
      checkpointer=checkpointer
    )
  return _agents[slug]

  