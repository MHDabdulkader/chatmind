import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader


def extract_text(path: str) -> str:
  if path.lower().endswith(".pdf"):
    return "\n".join(p.extract_text() or "" for p in PdfReader(path).pages)

  with open(path, encoding="utf-8", errors="ignore") as f:
    return f.read()

def fetch_url_text(url:str) -> str:
  r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
  r.raise_for_status()
  soup = BeautifulSoup(r.text, "html.parser")
  for t in soup(["script", "style", "nav", "footer", "header"]):
    t.decompose()
  return " ".join(soup.get_text(separator=" ").split())
