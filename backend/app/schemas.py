from pydantic import BaseModel, ConfigDict
from datetime import datetime

class ChatIn(BaseModel):
  message: str
  thread_id: str | None = None
  model: str | None = None
  project_id: str | None = None


class UrlIn(BaseModel):
  url: str
  project_id: str = "default"

class DocumentOut(BaseModel):
  model_config = ConfigDict(from_attributes = True)

  id: str
  project_id: str
  name: str
  kind: str
  size_bytes: int
  status: str
  chunks: int
  error: str | None = None
  created_at: datetime


class ProjectIn(BaseModel):
  name: str
  description: str = ""

class ProjectOut(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: str
  name: str
  description: str
  created_at: datetime



