import uuid

from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

def _id(): 
  return uuid.uuid4().hex

def _now() -> datetime:
  return datetime.now(timezone.utc)

class Document(Base):
  __tablename__ = "documents"

  id: Mapped[str] = mapped_column(String, primary_key=True,default=_id)
  project_id: Mapped[str] = mapped_column(String, default="default", index=True)
  name: Mapped[str] = mapped_column(String)
  kind: Mapped[str] = mapped_column(String)

  size_bytes: Mapped[int] = mapped_column(Integer, default=0)
  status: Mapped[str] = mapped_column(String, default="indexing")
  chunks: Mapped[int] = mapped_column(Integer, default=0)
  error: Mapped[str | None] = mapped_column(Text, nullable=True)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
  

class Project(Base):
  __tablename__ = "projects"

  id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
  name : Mapped[str] = mapped_column(String)
  description: Mapped[str] = mapped_column(Text, default="")
  created_at : Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Prompt(Base):
  __tablename__ = "prompts"

  id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
  name: Mapped[str] = mapped_column(String)
  description : Mapped[str] = mapped_column(Text, default="")
  template: Mapped[str] = mapped_column(String)
  category: Mapped[str] = mapped_column(String, default="General", index=True)
  tags: Mapped[list] = mapped_column(JSON, default=list)
  pinned : Mapped[bool] = mapped_column(Boolean, default=False)
  run_count: Mapped[int] = mapped_column(Integer, default=0)
  created_at : Mapped[datetime] = mapped_column(DateTime(timezone=True),  default=_now)

  @property
  def est_tokens(self) -> int:
    return max(1, len(self.template or "")//4)


class Thread(Base):
  __tablename__ = "threads"

  id : Mapped[str] = mapped_column(String, primary_key=True)
  title: Mapped[str] = mapped_column(String, default="New chat")
  project_id : Mapped[str] = mapped_column(String, nullable=True, index=True)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
  updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
  
