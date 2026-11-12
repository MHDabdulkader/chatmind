import uuid

from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
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

  size_bytes: Mapped[str] = mapped_column(Integer, default=0)
  status: Mapped[str] = mapped_column(String, default="indexing")
  chunks: Mapped[str] = mapped_column(Integer, default=0)
  error: Mapped[str | None] = mapped_column(Text, nullable=True)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
  

class Project(Base):
  __tablename__ = "projects"

  id: Mapped[str] = mapped_column(String, primary_key=True, default=_id)
  name : Mapped[str] = mapped_column(String)
  description: Mapped[str] = mapped_column(Text, default="")
  created_at : Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


