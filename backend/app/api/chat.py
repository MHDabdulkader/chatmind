import time
import traceback
import uuid

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage

from app.core.llm import get_model
from app.core.agent import get_agent
from app.schemas import ChatIn
from app.services.events import sse
from app.core.context import ChatContext

router = APIRouter(tags=["chat"])


def _text(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(p.get("text", "") 
        if isinstance(p, dict) 
        else str(p) 
        for p in content
        )
    return ""

@router.post("/chat")
def chat(body: ChatIn):
  thread_id = body.thread_id or str(uuid.uuid4())
  # model = get_model(body.model)


  def gen():
    t0, steps = time.time(), 0
    usage = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
    # print(f"[Chat] model={model.model_name!r} msg={body.message[:60]!r}")
    try:
      agent = get_agent(body.model)
      config = {"configurable": {"thread_id": thread_id}}
      yield sse("thread", {"thread_id": thread_id})
      print(f"[CHAT] thread={thread_id[:8]} msg={body.message[:60]!r}")

      for mode, payload in agent.stream(
        {"messages": [{"role": "user", "content": body.message}]},
        config,
        context=ChatContext(project_id=body.project_id, allow_web=body.allow_web),
        stream_mode=["messages", "updates"]
      ):
        if mode == "messages" :
          chunk, meta = payload
          if meta.get("langgraph_node") == "model":
            text = _text(chunk.content)
            if text:
              yield sse("token",  text)
        elif mode == "updates":
          for node, data in payload.items():
            if node != "model" or not isinstance(data, dict):
              continue
            msgs = data.get("messages", [])

            if not msgs:
              continue
            last = msgs[-1]
            for tc in getattr(last, "tool_calls", None):
              steps += 1
              print(f"[STEP] {tc["name"]} {tc["args"]}")
              yield sse("step", {"tool": tc["name"], "args": tc["args"]})
            um = getattr(last, "usage_metadata", None) 
            if um:
              for k in usage:
                usage[k] += um.get(k,0)

      yield sse("done", {
        "seconds": round(time.time()- t0, 1),
        "steps": steps,
        "usage": usage
      })         

    except Exception as e:
      traceback.print_exc()
      yield sse("error", f"{type(e).__name__} : {e}")

  return StreamingResponse(gen(), media_type="text/event-stream")


