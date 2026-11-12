from dataclasses import dataclass

@dataclass
class ChatContext:
  project_id : str | None = None
  allow_web : bool = True


