import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.agent import checkpointer, get_agent
from app.db import get_db
from app.models import Thread
from app.schemas import ThreadOut, ThreadPatch

router = APIRouter(prefix="/threads", tags=["threads"])

def _text(content) -> str:
  if isinstance(content, str):
    return content
  if isinstance(content, list):
    return "".join(
      p.get("text", "") if isinstance(p, dict) and p.get("type") == "text" else ""
      for p in content
    )
  return ""

def _parse_human_content(raw_text: str):
  if "--- [Attached Content #" not in raw_text:
    return raw_text, []
  
  parts = re.split(r"(?:^|\r?\n)+--- \[Attached Content #\d+:\s*(.*?)\] ---\r?\n", raw_text)
  main_text = parts[0].strip()
  attachments = []
  for i in range(1, len(parts), 2):
    title = parts[i]
    body = (parts[i+1] if i+1 < len(parts) else "").strip()
    attachments.append({
      "id": f"att-{i}",
      "title": title or "Attached Snippet",
      "content": body,
      "lines": len(body.splitlines()),
      "sizeKb": round(len(body.encode("utf-8")) / 1024, 1)
    })
  return main_text, attachments

@router.get("", response_model=list[ThreadOut])
def list_threads(project_id:str | None=None, limit: int =50, db: Session=Depends(get_db)):
  q = db.query(Thread)
  if project_id:
    q = q.filter(Thread.project_id == project_id)
  return q.order_by(Thread.updated_at.desc()).limit(min(limit, 200)).all()

@router.get("/{tid}/messages")
def messages(tid:str, db: Session= Depends(get_db)):
  if not db.get(Thread, tid):
    raise HTTPException(404, "Not found")

  state = get_agent().get_state({"configurable": {"thread_id": tid}})
  msgs = (state.values or {}).get("messages", []) if state else []

  out, steps = [], []

  for m in msgs:
    if m.type == "human":
      main_text, atts = _parse_human_content(_text(m.content))
      out.append({
        "role": "user",
        "content": main_text,
        "pastedAttachments": atts,
        "images": []
      })
      steps = []
    elif m.type == "ai":
      for tc in getattr(m, "tool_calls", None) or []:
        steps.append(tc["name"])
      text = _text(m.content)
      if text and not getattr(m, "tool_calls", None):
        out.append({"role": "assistant", "content": text, "steps": steps})
        steps = []
  
  return out


@router.patch("/{tid}", response_model=ThreadOut)
def rename(tid: str, body: ThreadPatch, db: Session=Depends(get_db)):
  t = db.get(Thread, tid)
  if not t:
    raise HTTPException(404, "Not found")
  
  t.title = body.title.strip()[:120] or t.title
  db.commit()
  db.refresh(t)

  return t

@router.delete("/{tid}")
def delete_thread(tid: str, db:Session = Depends(get_db)):
  t = db.get(Thread, tid)
  if not t:
    raise HTTPException(404, "Not found")
  if hasattr(checkpointer, "delete_thread"):
    checkpointer.delete_thread(tid)

  db.delete(t)
  db.commit()

  return {"deleted": tid}    
