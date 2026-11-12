from dataclasses import dataclass

@dataclass
class ChatContext:
  project_id : str | None = None

