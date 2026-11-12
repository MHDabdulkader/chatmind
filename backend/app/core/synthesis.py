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
  finding = list[Finding]


PROMPT = (
  "Write exactly 3 key findings using ONLY the context below. "
  "For each give a short title, a 2-sentence body, and the source names it came from"
  "Return JSON: {{\"findings\": [{{\"title\": \"\", \"body\": \"\", \"sources\": []}}]}}\n\n"
  "Context:\n{ctx}"
)


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

  try:
    result = model.with_structured_output(Synthesis).invoke(prompt)
    data = result.model_dump()

  except Exception as e:
    print(f"[SYNTH] structured output failed ({type(e).__name__}); parsing JSON")
    raw = model.invoke(prompt).content
    raw = raw if isinstance(raw, str) else str(raw)
    m = re.search(r"\{.*\}", raw, re.S)
    data = json.loads(m.group(0)) if m else {"feeling": []}
  
  for f in data.get("findings", []):
    f["sources"] = [s for s in f.get("sources", []) if s in  known]
  
  return data