import glob
import os
import traceback

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.core import rag
from app.db import SessionLocal, get_db
from app.models import Document
from app.schemas import DocumentOut, UrlIn
from app.services.ingest import extract_text, fetch_url_text

router = APIRouter(prefix="/documents", tags=["documents"])

CODE_EXTENSIONS = (
    ".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".html", ".css",
    ".sql", ".rs", ".go", ".c", ".cpp", ".java", ".sh", ".yaml", ".yml"
)
IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg")
DOC_EXTENSIONS = (".pdf", ".txt", ".md", ".csv")

ALLOWED = DOC_EXTENSIONS + CODE_EXTENSIONS + IMAGE_EXTENSIONS


def _index_job(doc_id: str, loader, is_image: bool = False):
  """Runs in the background with its own DB session."""
  db = SessionLocal()
  doc = db.get(Document, doc_id)
  try:
    if is_image:
      doc.chunks = 0
      doc.status = "ready"
    else:
      print(f"[INGEST] {doc.name}")
      text = loader()
      if not text.strip():
        raise ValueError("No text could be extracted")
      doc.chunks = rag.add_document(text, doc.name, doc.project_id, doc.id)
      doc.status = "indexed"
  except Exception as e:
    traceback.print_exc()
    doc.status = "failed"
    doc.error = f"{type(e).__name__}: {e}"
  finally:
    db.commit()
    db.close()


@router.post("", response_model=DocumentOut)
def upload(
  background: BackgroundTasks,
  file: UploadFile = File(...),
  project_id: str = Form("default"),
  db: Session = Depends(get_db)
):
  filename_lower = file.filename.lower()
  if not filename_lower.endswith(ALLOWED):
    raise HTTPException(400, f"Allowed extensions: {', '.join(ALLOWED[:8])}...")
  
  if filename_lower.endswith(IMAGE_EXTENSIONS):
    kind = "image"
  elif filename_lower.endswith(CODE_EXTENSIONS):
    kind = "code"
  elif filename_lower.endswith(".pdf"):
    kind = "pdf"
  else:
    kind = "document"

  doc = Document(project_id=project_id, name=file.filename, kind=kind)

  db.add(doc)
  db.commit()
  db.refresh(doc)

  os.makedirs(settings.upload_dir, exist_ok=True)
  path = os.path.join(settings.upload_dir, f"{doc.id}_{os.path.basename(file.filename)}")
  data = file.file.read()
  with open(path, "wb") as f:
    f.write(data)
  doc.size_bytes = len(data)
  db.commit()
  db.refresh(doc)

  is_image = (kind == "image")
  background.add_task(_index_job, doc.id, lambda: extract_text(path), is_image=is_image)
  return doc


@router.post("/url", response_model=DocumentOut)
def add_url(body: UrlIn, background: BackgroundTasks, db: Session = Depends(get_db)):
  doc = Document(project_id=body.project_id, name=body.url, kind="url")
  db.add(doc)
  db.commit()
  db.refresh(doc)
  background.add_task(_index_job, doc.id, lambda: fetch_url_text(body.url), is_image=False)
  return doc


@router.get("", response_model=list[DocumentOut])
def list_documents(project_id: str | None = None, db: Session = Depends(get_db)):
  q = db.query(Document)
  if project_id:
    q = q.filter(Document.project_id == project_id)
  
  return q.order_by(Document.created_at.desc()).all()


@router.get("/{doc_id}", response_model=DocumentOut)
def get_document(doc_id: str, db: Session = Depends(get_db)):
  doc = db.get(Document, doc_id)
  if not doc:
    raise HTTPException(404, "Not found")

  return doc


@router.get("/{doc_id}/content")
def get_document_content(doc_id: str, db: Session = Depends(get_db)):
  doc = db.get(Document, doc_id)
  if not doc:
    raise HTTPException(404, "Not found")
  files = glob.glob(os.path.join(settings.upload_dir, f"{doc_id}_*"))
  if not files:
    raise HTTPException(404, "File not found on disk")
  file_path = files[0]
  return FileResponse(file_path, filename=doc.name)


@router.delete("/{doc_id}", response_model=None)
def delete_document(doc_id: str, db: Session = Depends(get_db)):
  doc = db.get(Document, doc_id)
  if not doc:
    raise HTTPException(404, "Not found")
  rag.delete_document(doc_id)

  for p in glob.glob(os.path.join(settings.upload_dir, f"{doc_id}_*")):
    try:
      os.remove(p)
    except Exception as e:
      print(f"Error removing {p}: {e}")
  
  db.delete(doc)
  db.commit()
  return {"deleted": doc_id}
