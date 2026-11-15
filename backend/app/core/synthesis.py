import json 
import re

from pydantic import BaseModel

from app.core import rag
from app.core.llm import get_model

class Finding(BaseModel):
  title: str
  body: str
  sources: list[str]

class Synthesis(BaseModel):
  findings : list[Finding]

  
PROMPT = (
    "Write exactly 3 key findings using ONLY the context below. "
    "For each give a short title, a 2-sentence body, and the source names it came from. "
    "Return ONLY JSON, no markdown, in this shape: "
    "{{\"findings\": [{{\"title\": \"...\", \"body\": \"...\", \"sources\": [\"file.txt\"]}}]}}\n\n"
    "Context:\n{ctx}"
)


def _content(res) -> str:
  c = res.content
  if isinstance(c, list):
    c = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in c)
  return c or res.additional_kwargs.get("reasoning_content", "") or ""

def _parse(res: str) -> dict:
  raw = re.sub(r"```(?:json)?", "", res)
  m = re.search(r"\{.*\}", raw, re.S)
  return json.loads(m.group(0)) if m else {}



def synthesize(project_id: str, slug: str | None = None) -> dict:
  docs = rag.store.similarity_search(
    "key findings main points summary", k=12, filter={"project":project_id}
  )

  if not docs:
    return {"findings": [], "note": "No indexed documents in this project."}
  
  known = {d.metadata.get("source") for d in docs}
  ctx =  "\n\n".join(f"[{d.metadata.get("source")}] {d.page_content}" for d in docs)
  model = get_model(slug)
  prompt = PROMPT.format(ctx=ctx)
  data: dict = {}


  try:
    result = model.with_structured_output(Synthesis).invoke(prompt)
    data = result.model_dump()
    print(f"[SYNTH] structured -> {len(data.get("findings", []))} findings")
  except Exception as e:
    print(f"[SYNTH] structured output failed ({type(e).__name__}: {e}); parsing JSON")
    
  if not data.get("findings"):
    raw = _content(model.invoke(prompt))
    print(f"[SYNTH] raw output: {raw[:400]!r}")

    try:
      data = _parse(raw)
    except json.JSONDecodeError as e:
      print(f"[SYNTH] JSON parse failed: {e}")
      data = {}

  findings = []
  for f in data.get("findings", []) or []:
    if not isinstance(f,dict) or not f.get("title"):
      continue
    findings.append({
      "title": f.get("title", ""),
      "body": f.get("body", ""),
      "sources": [s for s in f.get("sources", []) if s in known]
    })

  out = {"findings": findings}
  if not findings:
    out["note"] = "Model returned no usable findings"

  return out