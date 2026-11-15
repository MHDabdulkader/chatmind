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
from app.services.threads import touch_thread

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
      touch_thread(thread_id, body.message, body.project_id)
      print(f"[CHAT] thread={thread_id[:8]} msg={body.message[:60]!r}")

      limit_notified = False
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
              if not limit_notified and ("free-models-per-day" in text or "Rate limit exceeded" in text or "TooManyRequestsResponseError" in text):
                limit_notified = True
                yield sse("limit_exceeded", {
                  "provider": "OpenRouter",
                  "reason": "daily_free_limit",
                  "message": "OpenRouter daily free requests limit reached (free-models-per-day). Resets at 00:00 UTC.",
                  "alternative": "gemini-3.8-flash"
                })
              yield sse("token",  text)
        elif mode == "updates":
          for node, data in payload.items():
            if node != "model" or not isinstance(data, dict):
              continue
            msgs = data.get("messages", [])

            if not msgs:
              continue
            last = msgs[-1]
            last_text = str(getattr(last, "content", ""))
            if not limit_notified and ("free-models-per-day" in last_text or "Rate limit exceeded" in last_text or "TooManyRequestsResponseError" in last_text):
              limit_notified = True
              yield sse("limit_exceeded", {
                "provider": "OpenRouter",
                "reason": "daily_free_limit",
                "message": "OpenRouter daily free requests limit reached (free-models-per-day). Resets at 00:00 UTC.",
                "alternative": "gemini-3.5-flash"
              })
            for tc in (getattr(last, "tool_calls", []) or []):
              steps += 1
              print(f"[STEP] {tc['name']} {tc['args']}")
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
      err_text = str(e)
      if "RESOURCE_EXHAUSTED" in err_text or "Quota exceeded" in err_text:
        model_name = body.model or "gemini-3.8-flash"
        yield sse("limit_exceeded", {
          "provider": "Google",
          "reason": "daily_free_limit",
          "message": f"Daily quota limit exceeded for '{model_name}'. Switch to Gemini 3.5 Flash for high free limits.",
          "alternative": "gemini-3.5-flash"
        })
        msg = f"Quota exceeded for {model_name}. Please switch to Google Gemini 3.5 Flash to continue chatting."
        yield sse("error", msg)
      elif "free-models-per-day" in err_text:
        yield sse("limit_exceeded", {
          "provider": "OpenRouter",
          "reason": "daily_free_limit",
          "message": "OpenRouter daily free requests limit reached (free-models-per-day). Resets at 00:00 UTC.",
          "alternative": "gemini-3.5-flash"
        })
        msg = "Daily Free Quota Exceeded on OpenRouter (free-models-per-day). Your Google Gemini key is active—click the banner below to switch to Gemini 3.5 Flash and continue chatting instantly!"
        yield sse("error", msg)
      elif "429" in err_text or "rate-limited" in err_text.lower() or "TooManyRequests" in type(e).__name__:
        model_name = body.model or settings.default_model
        yield sse("limit_exceeded", {
          "provider": "Google" if "gemini" in str(model_name).lower() else "OpenRouter",
          "reason": "upstream_rate_limited",
          "message": f"Model '{model_name}' is temporarily rate-limited upstream.",
          "alternative": "gemini-3.5-flash"
        })
        msg = f"The model '{model_name}' is temporarily rate-limited upstream. Switch to Google Gemini 3.5 Flash to continue."
        yield sse("error", msg)
      else:
        yield sse("error", f"{type(e).__name__}: {e}")

  return StreamingResponse(gen(), media_type="text/event-stream")


