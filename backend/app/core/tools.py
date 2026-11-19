import requests
import os 
import re
from urllib.parse import parse_qs, unquote, urlparse


from bs4 import BeautifulSoup
from ddgs import DDGS
from langchain.tools import tool, ToolRuntime

from app.core.context import ChatContext
from app.core import rag



# * __ DOCS ____________________________________________________________________________
@tool
def search_docs(query:str, runtime: ToolRuntime[ChatContext]) -> str:
  """Search the user's uploaded documents. Use this first for questions about their files"""
  project_id = runtime.context.project_id if runtime.context else None
  results = rag.search(query, k=4, project_id=project_id)
  print(f"[TOOL] search_docs({query!r}, project={project_id}) -> {len(results)} chunks")
  if not results:
    return "No documents indexed"
  return "\n\n".join(
    f"[{d.metadata.get('source', '?')} | Rerank Score: {score:.4f}] {d.page_content}" for d, score in results
  )  


# * __ Web search ___________________________________________________________________________
def _tavily(query: str) -> list[dict]:
  key = os.getenv("TAVILY_API_KEY")
  if not key:
    print("[TOOL] tavily skipped: TAVILY_API_KEY not set")
    return []

  r = requests.post(
    "https://api.tavily.com/search",
    headers={"Authorization": f"Bearer {key}"},
    json={"query": query, "max_results": 5},
    timeout=20
  )

  r.raise_for_status()

  return [
    {
      "title": x["title"],
      "href": x["url"],
      "body": x["content"]
    }
    for x in r.json().get("results", [])
  ]


def _ddgs(query: str) -> list[dict]:
  for backend, region in [("google", "uk-en"), ("auto","uk-en")]:
    try:
      hits = DDGS().text(query, max_results=5, backend=backend, region=region)
      if hits:
        return hits
    except Exception as e:
      print(f"[TOOL] ddgs {backend}/{region} failed: {type(e).__name__}")
  return []


def _ddg_html(query: str) -> list[dict]:
  r = requests.post(
    "https://html.duckduckgo.com/html/",
    data={"q": query},
    headers={"User-Agent": "Mozilla/5.0"},
    timeout=15
  )
  r.raise_for_status()
  soup = BeautifulSoup(r.text, "html.parser")
  out = []
  for res in soup.select("div.result")[:5]:
    a = res.select_one("a.result__a")
    s = res.select_one("a.result_snippet")
    if not a:
      continue
    href = a.get("href","")
    if "uddg=" in href:
      href = unquote(parse_qs(urlparse(href).query).get("uddg", [href])[0])
    out.append({
      "title": a.get_text(strip=True),
      "href": href,
      "body": s.get_text(strip=True) if s else ""
    })    
  return out

def _page_text(soup: BeautifulSoup) -> str:
    for t in soup(["script", "style", "nav", "footer", "header"]):
        t.decompose()
    for tr in soup.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
        tr.replace_with(" | ".join(cells) + "\n")
    text = soup.get_text(separator="\n")
    return "\n".join(line.strip() for line in text.splitlines() if line.strip())


def _relevent(query: str, hits:list[dict]) -> list[dict]:
  words = {w for w in re.findall(r"[a-z0-9.]+", query.lower())  if len(w) > 3}
  return [
    h for h in hits
    if sum(w in f"{h['title']} {h['body']}".lower() for w in words) >= 2
  ]  

def _search(query: str) -> list[dict]:
  for name, fn in [("tavily", _tavily), ("ddgs", _ddgs), ("ddgs_html", _ddg_html)]:
    try:
      hits = fn(query)
      if name != "tavily":
        hits = _relevent(query, hits)
      if hits:
        print(f"[TOOL] web_search via {name}: {[h["href"] for h in hits[:3]]}")
        return hits
      print(f"[TOOL] {name}: No relevant results")
    except Exception as e:
      print(f"[TOOL] {name} failed: {type(e).__name__}: {str(e)[:80]}")
  return []

def _web_off(runtime) -> bool:
    ctx = getattr(runtime, "context", None)
    return ctx is not None and not ctx.allow_web

@tool
def web_search(query: str, runtime:ToolRuntime[ChatContext]) -> str:
  """Search the web for current or public information not found in the documents."""
  if _web_off(runtime):
    return "Web access is disabled for this chat. Answer from the documents only."

  print(f"[TOOL] web_search({query!r})")
  hits = _search(query)
  if not hits:
    return "Search failed: no results. Tell the user you could not verify this. do not guess"
  return "\n\n".join(f"{h["title"]}\n{h["href"]}\n{h["body"]}" for h in hits) or "No results."


@tool
def read_webpage(url: str, runtime:ToolRuntime[ChatContext]) -> str:
  """Open a web page URL(e.g. from web_search results) and return its text."""
  if _web_off(runtime):
    return "Web access is disabled for this chat."
  
  print(f"[TOOL] read_webpage({url})")
  try:
    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
    r.raise_for_status()
  except requests.RequestException as e:
    print(f"[TOOL] read_webpage failed: {e}")
    return f"Could not open page: {e}"

  soup = BeautifulSoup(r.text, "html.parser")

  for t in soup(["scripts", "style", "nav", "footer", "header"]):
    t.decompose()

  return _page_text(soup)[:7000]


ALL_TOOLS = [search_docs, web_search, read_webpage]



