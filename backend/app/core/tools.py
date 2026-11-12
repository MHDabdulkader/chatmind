import requests

from bs4 import BeautifulSoup
from ddgs import DDGS
from langchain.tools import tool, ToolRuntime
from app.core.context import ChatContext

from app.core import rag

def _web_off(runtime=ToolRuntime[ChatContext]) -> bool:
  return bool(runtime.context) and not runtime.context.allow_web



@tool
def search_docs(query:str, runtime: ToolRuntime[ChatContext]) -> str:
  """Search the user's uploaded documents. Use this first for questions about their files"""


  project_id = runtime.context.project_id if runtime.context else None

  results = rag.search(query, k=4, project_id=project_id)
  print(f"[TOOL] search_docs({query!r}, project={project_id}) -> {len(results)} chunks")

  if not results:
    return "No documents indexed"

  return "\n\n".join(
    f"[{d.metadata.get("source", "?")}] {d.page_content}" for d, _ in results
  )  


@tool
def web_search(query: str, runtime=ToolRuntime[ChatContext]) -> str:
  """Search the web for current or public information not found in the documents."""
  if _web_off(runtime):
    return "Web access is disabled for this chat. Answer from the documents only."

  print(f"[TOOL] web_search({query!r})")
  try:
    hits= DDGS().text(query, max_results=5)
  except Exception as e:
    return f"Search failed: {e}"

  return "\n\n".join(f"{h["title"]}\n{h["href"]}\n{h["body"]}" for h in hits) or "No results."


@tool
def read_webpage(url: str) -> str:
  """Open a web page URL(e.g. from web_search results) and return its text."""
  if _web_off(runtime):
    return "Web access is disabled for this chat."
  
  print(f"[TOOL] read_webpage({url})")
  try:
    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
    r.raise_for_status()
  except requests.RequestException as e:
    return f"Could not open page: {e}"

  soup = BeautifulSoup(r.text, "html.parser")

  for t in soup(["scripts", "style", "nav", "footer", "header"]):
    t.decompose()

  return " ".join(soup.get_text(separator=" ").split())[:6000] 


ALL_TOOLS = [search_docs, web_search, read_webpage]



