from app.db import SessionLocal
from app.models import Thread, _now

def _title(message:str) -> str:
  clean = message.split("--- [Attached Content #")[0].strip()
  t = " ".join(clean.split())
  return (t[:57] + "...") if len(t) > 60 else (t or "New chat")

def touch_thread(thread_id:str, message: str, project_id: str | None) -> None:
  """Create the thread now on first message, bump updated_at on every message."""
  db = SessionLocal()
  try:
    t = db.get(Thread, thread_id)
    if not t:
      t = Thread(id=thread_id, title=_title(message), project_id=project_id)
      db.add(t)
    t.updated_at = _now()
    db.commit()
  finally:
    db.close()

  