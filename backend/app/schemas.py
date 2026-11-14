from pydantic import BaseModel, ConfigDict
from datetime import datetime

class ChatIn(BaseModel):
  message: str
  thread_id: str | None = None
  model: str | None = None
  project_id: str | None = None
  allow_web: bool = True


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


class PromptIn(BaseModel):
  name: str
  description: str = ""
  template: str
  category: str = "General"
  tags: list[str] = []

class PromptPatch(BaseModel):
  name: str | None = None
  description: str | None = None
  template: str | None = None
  category : str | None = None
  tags : list[str] | None = None
  pinned : bool | None = None

class PromptOut(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: str
  name: str
  description: str
  template: str
  category: str
  tags: list[str]
  pinned : bool
  run_count: int
  est_tokens: int
  created_at: datetime

class RunIn(BaseModel):
  input: str
  model: str | None = None




