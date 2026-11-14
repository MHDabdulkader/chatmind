from langchain.agents import create_agent
from langchain.agents.middleware import ModelRetryMiddleware, ToolRetryMiddleware, ModelCallLimitMiddleware, ToolCallLimitMiddleware
from langgraph.checkpoint.memory import InMemorySaver

from app.config import settings
from app.core.llm import get_model
from app.core.tools import ALL_TOOLS
from app.core.context import ChatContext

from datetime import date
from langchain.agents.middleware import dynamic_prompt, ModelRequest

SYSTEM_PROMPT = (
    "You are a research assistant. "
    "For questions about the user's files or project, call search_docs first. "
    "Use web_search only when the question needs current or public information "
    "that the documents cannot cover, and make at most 2 web searches. "
    "If the question is ambiguous and the documents don't answer it, ask which one they mean. "
    "For 'latest' or 'current' questions, answer ONLY from web results. "
    "If the web tools fail or return nothing useful, say you could not verify it "
    "and do NOT answer from memory. "
    "State which source you used (document name or URL). Never invent facts."
    "When a page has a table of versions, 'latest stable' is the highest version "
    "whose status is not pre-release, alpha, beta, or feature. "
    "Quote the exact row you used. "
)


checkpointer = InMemorySaver()

_agents: dict[str, object] = {}


@dynamic_prompt
def prompt_with_date(request: ModelRequest) -> str:
    return f"{SYSTEM_PROMPT} Today's date is {date.today():%B %d, %Y}."

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
        ToolRetryMiddleware(max_retries=2, on_failure="continue"),
        ModelCallLimitMiddleware(run_limit=8, exit_behavior="end"),
        ToolCallLimitMiddleware(run_limit=5)
      ],
      checkpointer=checkpointer
    )
  return _agents[slug]

  