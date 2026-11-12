import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import chat, documents
from app.db import Base, engine
from app import models

@asynccontextmanager
async def lifespan(app: FastAPI):
  os.makedirs("data", exist_ok=True)
  os.makedirs(settings.upload_dir, exist_ok=True)
  Base.metadata.create_all(engine)
  yield



app = FastAPI(title="ChatMind API")

app.add_middleware(
  CORSMiddleware, 
  allow_origins = settings.origins,
  allow_methods = ["*"],
  allow_headers = ["*"]
)

app.include_router(chat.router)
app.include_router(documents.router)

@app.get("/health")
def health():
  return {"status": "ok"}