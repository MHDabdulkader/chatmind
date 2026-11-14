import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import chat, documents, projects, prompts
from app.db import Base, engine, SessionLocal
from app import models
from app.models import Project



@asynccontextmanager
async def lifespan(app: FastAPI):
  os.makedirs("data", exist_ok=True)
  os.makedirs(settings.upload_dir, exist_ok=True)
  Base.metadata.create_all(engine)
  print("[DB] Tables: ", list(Base.metadata.tables))
  db = SessionLocal()

  if not db.get(Project, "default"):
    db.add(Project(id="default", name="Default", description="Default description"))
    db.commit()

  prompts.seed_prompts()
  db.close()  

  yield



app = FastAPI(title="ChatMind API", lifespan=lifespan)

app.add_middleware(
  CORSMiddleware, 
  allow_origins = settings.origins,
  allow_methods = ["*"],
  allow_headers = ["*"]
)

app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(projects.router)
app.include_router(prompts.router)


@app.get("/health")
def health():
  return {"status": "ok"}