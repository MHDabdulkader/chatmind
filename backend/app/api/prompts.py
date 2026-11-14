from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.llm import get_model
from app.db import SessionLocal, get_db
from app.models import Prompt
from app.schemas import PromptIn, PromptOut, PromptPatch, RunIn

router = APIRouter(prefix="/prompts", tags=["prompts"])

SEEDS = [
    ("Smart Summarizer", "Condense long documents and notes into crisp bulleted briefs.",
     "Summarize the following into concise bullet points:\n\n{input}", "Synthesis", True),
    ("Code Assistant", "Write, refactor, and explain clean functions across languages.",
     "You are a senior engineer. Help with this code task:\n\n{input}", "Engineering", True),
    ("Study Partner", "Master complex topics through interactive Q&A and quizzes.",
     "Teach me this topic step by step, then quiz me with 3 questions:\n\n{input}", "Learning", True),
    ("Idea Spark", "Unblock creative barriers and generate novel outlines and ideas.",
     "Give me 8 fresh, distinct ideas for:\n\n{input}", "Ideation", True),
]

def seed_prompts() -> None:
  db = SessionLocal()
  if db.query(Prompt).count() == 0 :
    for name, desc, tpl, cat, pinned in SEEDS:
      db.add(Prompt(name=name, description=desc, template=tpl, category=cat, pinned=pinned))
    db.commit()
    print(f"[SEED] {len(SEEDS)} prompts")
  db.close()

@router.get("", response_model=list[PromptOut])
def list_prompts(
  q: str | None = None,
  category: str| None = None,
  pinned: bool | None = None, 
  db: Session = Depends(get_db)
):
  query = db.query(Prompt)

  if q:
    like = f"%{q}%"
    query = query.filter(or_(Prompt.name.ilike(like), Prompt.description.ilike(like)))
  if category and category != "All":
    query = query.filter(Prompt.category == category)
  if pinned is not None:
    query = query.filter(Prompt.pinned == pinned)

  return query.order_by(Prompt.pinned.desc(), Prompt.created_at.desc()).all()  
  

@router.post("", response_model=PromptOut)
def create_prompt(body: PromptIn, db: Session=Depends(get_db)):
  p = Prompt(**body.model_dump())
  db.add(p)
  db.commit()
  db.refresh(p)
  return p

@router.get("/{pid}", response_model=PromptOut)
def get_prompt(pid: str, db: Session=Depends(get_db)):
  p = db.get(Prompt, pid)
  if not p:
    raise HTTPException(404, "Not found")
  return p

@router.patch("/{pid}", response_model=PromptOut)
def update_prompt(pid:str, body: PromptPatch, db: Session=Depends(get_db)):
  p = db.get(Prompt, pid)

  if not p:
    raise HTTPException(404, "Not found")

  for k, v in body.model_dump(exclude_defaults=True).items():
    setattr(p, k, v)

  db.commit()
  db.refresh(p)

  return p

@router.post("/{pid}/pin", response_model=PromptOut)
def toggle_pin(pid: str, db: Session = Depends(get_db)):
  p = db.get(Prompt, pid)
  if not p:
    raise HTTPException(404, "Not found")
  p.pinned= not p.pinned

  db.commit()
  db.refresh(p)
  return p


@router.delete("/{pid}")
def delete_prompt(pid: str, db: Session=Depends(get_db)):
  p = db.get(Prompt, pid)
  if not p:
    raise HTTPException(404, "Not found")

  db.delete(p)
  db.commit()

  return {"delete": pid}


@router.post("/{pid}/run")
def run_prompt(pid: str, body: RunIn, db: Session=Depends(get_db)):
  p = db.get(Prompt, pid)
  if not p:
    raise HTTPException(404, "Not found")
  
  filled = (
    p.template.replace("{input}", body.input)
    if "{input}" in p.template
    else f"{p.template}\n\n{body.input}"
  )

  print(f"[PROMPT] run {p.name!r} ({len(filled)} chars)")

  res = get_model(body.model).invoke(filled)
  out = res.content

  if isinstance(out, list):
    out = "".join(x.get("text", "") if isinstance(x, dict) else str(x) for x in out)
  p.run_count += 1

  db.commit()
  return {
    "prompt": p.name,
    "output": out or res.additional_kwargs.get("reasoning_content", "")
  }


