from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from sqlalchemy import func

from app.core import rag
from app.core.synthesis import synthesize
from app.db import get_db
from app.schemas import ProjectIn,  ProjectOut
from app.models import Project, Document
router = APIRouter(prefix="/projects", tags=["projects"])



@router.post("", response_model=ProjectOut)
def create_project(body: ProjectIn, db: Session=Depends(get_db)):
  p = Project(name=body.name, description=body.description)
  db.add(p)
  db.commit()
  db.refresh(p)
  return p

@router.get("", response_model=list[ProjectOut])
def list_projects(db:Session=Depends(get_db)):
  pl = db.query(Project).order_by(Project.created_at.desc()).all()
  return pl


@router.get("/{pid}", response_model=ProjectOut)
def get_project(pid: str, db: Session=Depends(get_db)):
  p = db.get(Project, pid)
  if not p:
    raise HTTPException(404, "Not found")
  return p


@router.get("/{pid}/stats")
def get_stats(pid: str, db: Session=Depends(get_db)):
  rows = (
    db.query(
      Document.status,
      func.count(Document.id),
      func.coalesce(func.sum(Document.chunks), 0)
    )
    .filter(Document.project_id==pid)
    .group_by(Document.status)
    .all()
  )

  by_status = {status: count for status, count, _ in rows}

  return {
    "sources": sum(by_status.values()),
    "indexed": by_status.get("indexed", 0),
    "indexing": by_status.get("indexing", 0),
    "failed": by_status.get("failed", 0),
    "chunks": sum(int(c) for _, _, c in rows),
  }

@router.post("/{pid}/synthesis")
def synthesis(pid: str, model: str |None=None, db: Session = Depends(get_db)):
  if not db.get(Project, pid):
    raise HTTPException(404, "Not found")
  return synthesize



@router.delete("/{pid}")
def delete_project(pid: str, db: Session=Depends(get_db)):
  p = db.get(Project, pid)

  if not p:
    raise HTTPException(404, "Not found")
  
  for d in db.query(Document).filter(Document.project_id == pid).all():
    rag.delete_document(d.id)
    db.delete(d)

  db.delete(p)
  db.commit()

  return {"delete": pid}



