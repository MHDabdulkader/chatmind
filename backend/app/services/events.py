import json


def sse(event: str, data) -> str:
  return f"event: {event}\ndata: {json.dumps(data)}\n\n"