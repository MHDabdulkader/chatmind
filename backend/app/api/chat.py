import os
import time
import traceback
import uuid

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage

from app.config import settings
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
        return "".join(
            p.get("text", "") if isinstance(p, dict) else str(p)
            for p in content
        )
    return ""


try:
    from langfuse.langchain import CallbackHandler as LangfuseCallbackHandler
    from langfuse.types import TraceContext
    from langfuse import get_client as get_langfuse_client
except ImportError:
    try:
        from langfuse.callback import CallbackHandler as LangfuseCallbackHandler
        TraceContext = None
        get_langfuse_client = None
    except ImportError:
        LangfuseCallbackHandler = None
        TraceContext = None
        get_langfuse_client = None


@router.post("/chat")
def chat(body: ChatIn):
    thread_id = body.thread_id or str(uuid.uuid4())

    def gen():
        t0, steps = time.time(), 0
        usage = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}

        # 1. Initialize Langfuse Tracing
        langfuse_handler = None
        if LangfuseCallbackHandler and os.getenv("LANGFUSE_PUBLIC_KEY"):
            try:
                tc = (
                    TraceContext(
                        session_id=thread_id,
                        user_id="Kader",
                        tags=[body.model or "default", body.project_id or "default"],
                        metadata={
                            "allow_web": body.allow_web,
                            "has_images": bool(body.images),
                        },
                    )
                    if TraceContext
                    else None
                )
                langfuse_handler = (
                    LangfuseCallbackHandler(trace_context=tc)
                    if tc
                    else LangfuseCallbackHandler()
                )
            except Exception as lf_err:
                print(f"[LANGFUSE] Init error: {lf_err}")

        # 2. Attach callbacks to LangGraph config
        config = {
            "configurable": {"thread_id": thread_id},
            "callbacks": [langfuse_handler] if langfuse_handler else [],
        }

        try:
            yield sse("thread", {"thread_id": thread_id})
            touch_thread(thread_id, body.message, body.project_id)
            print(f"[CHAT] thread={thread_id[:8]} msg={body.message[:60]!r}")

            if body.images:
                user_content = [{"type": "text", "text": body.message or "Analyze this image:"}]
                for img in body.images:
                    user_content.append({"type": "image_url", "image_url": {"url": img}})
            else:
                user_content = body.message

            model_to_use = body.model or settings.default_model

            def get_stream(m_name):
                current_agent = get_agent(m_name)
                return current_agent.stream(
                    {"messages": [{"role": "user", "content": user_content}]},
                    config,
                    context=ChatContext(project_id=body.project_id, allow_web=body.allow_web),
                    stream_mode=["messages", "updates"],
                )

            # Auto-failover: if primary model hits 503 spike, seamlessly switch to gemini-3.5-flash-lite
            stream_iter = get_stream(model_to_use)
            first_item = None
            try:
                first_item = next(stream_iter)
            except Exception as first_err:
                err_str = str(first_err)
                err_name = type(first_err).__name__
                is_quota_or_capacity = any(
                    k.lower() in err_str.lower() or k in err_name
                    for k in [
                        "503",
                        "unavailable",
                        "high demand",
                        "resource_exhausted",
                        "quota exceeded",
                        "429",
                        "googleratelimiterror",
                        "googleapierror",
                        "ratelimit",
                    ]
                )
                if is_quota_or_capacity and model_to_use != "gemini-3.5-flash-lite":
                    print(f"[AUTO-FAILOVER] Limit/Spike on '{model_to_use}' -> auto-switching to 'gemini-3.5-flash-lite'...")
                    try:
                        model_to_use = "gemini-3.5-flash-lite"
                        stream_iter = get_stream(model_to_use)
                        first_item = next(stream_iter)
                    except Exception as second_err:
                        print(f"[AUTO-FAILOVER] Gemini Flash Lite also busy -> falling back to OpenRouter...")
                        model_to_use = "nvidia/nemotron-3.5-super-vl:free"
                        stream_iter = get_stream(model_to_use)
                        first_item = next(stream_iter)
                elif is_quota_or_capacity and model_to_use == "gemini-3.5-flash-lite":
                    print(f"[AUTO-FAILOVER] Gemini Flash Lite limit -> falling back to OpenRouter...")
                    model_to_use = "nvidia/nemotron-3.5-super-vl:free"
                    stream_iter = get_stream(model_to_use)
                    first_item = next(stream_iter)
                else:
                    raise first_err

            def chain_stream(first, rest):
                if first is not None:
                    yield first
                for item in rest:
                    yield item

            limit_notified = False
            for mode, payload in chain_stream(first_item, stream_iter):
                if mode == "messages":
                    chunk, meta = payload
                    if meta.get("langgraph_node") == "model":
                        text = _text(chunk.content)
                        if text:
                            # Catch LangGraph-captured model errors instead of streaming error text to user
                            if "Model call failed after" in text or "RESOURCE_EXHAUSTED" in text or "Quota exceeded" in text:
                                fallback_model = (
                                    "gemini-3.5-flash-lite"
                                    if model_to_use != "gemini-3.5-flash-lite"
                                    else "nvidia/nemotron-3.5-super-vl:free"
                                )
                                print(f"[AUTO-FAILOVER] Model error intercepted. Streaming fallback from '{fallback_model}'...")
                                yield sse(
                                    "limit_exceeded",
                                    {
                                        "provider": "Google" if "gemini" in str(model_to_use).lower() else "OpenRouter",
                                        "reason": "daily_free_limit",
                                        "message": f"Daily limit reached for '{model_to_use}'. Auto-switched to {fallback_model}.",
                                        "alternative": fallback_model,
                                    },
                                )
                                try:
                                    fallback_agent = get_agent(fallback_model)
                                    for fb_mode, fb_payload in fallback_agent.stream(
                                        {"messages": [{"role": "user", "content": user_content}]},
                                        config,
                                        context=ChatContext(project_id=body.project_id, allow_web=body.allow_web),
                                        stream_mode=["messages", "updates"],
                                    ):
                                        if fb_mode == "messages":
                                            fb_chunk, fb_meta = fb_payload
                                            if fb_meta.get("langgraph_node") == "model":
                                                fb_text = _text(fb_chunk.content)
                                                if fb_text and not fb_text.startswith("Model call failed"):
                                                    yield sse("token", fb_text)
                                        elif fb_mode == "updates":
                                            for fb_node, fb_data in fb_payload.items():
                                                if fb_node != "model" or not isinstance(fb_data, dict):
                                                    continue
                                                fb_msgs = fb_data.get("messages", [])
                                                if not fb_msgs:
                                                    continue
                                                fb_last = fb_msgs[-1]
                                                for fb_tc in getattr(fb_last, "tool_calls", []) or []:
                                                    steps += 1
                                                    yield sse("step", {"tool": fb_tc["name"], "args": fb_tc["args"]})
                                except Exception as fb_err:
                                    print(f"[AUTO-FAILOVER] Fallback failed: {fb_err}")
                                    yield sse("error", f"Model limit reached. Please switch model: {fb_err}")
                                break

                            if not limit_notified and (
                                "free-models-per-day" in text
                                or "Rate limit exceeded" in text
                                or "TooManyRequestsResponseError" in text
                            ):
                                limit_notified = True
                                yield sse(
                                    "limit_exceeded",
                                    {
                                        "provider": "OpenRouter",
                                        "reason": "daily_free_limit",
                                        "message": "OpenRouter daily free requests limit reached (free-models-per-day). Resets at 00:00 UTC.",
                                        "alternative": "gemini-3.5-flash-lite",
                                    },
                                )
                            yield sse("token", text)
                elif mode == "updates":
                    for node, data in payload.items():
                        if node != "model" or not isinstance(data, dict):
                            continue
                        msgs = data.get("messages", [])

                        if not msgs:
                            continue
                        last = msgs[-1]
                        last_text = str(getattr(last, "content", ""))
                        if not limit_notified and (
                            "free-models-per-day" in last_text
                            or "Rate limit exceeded" in last_text
                            or "TooManyRequestsResponseError" in last_text
                        ):
                            limit_notified = True
                            yield sse(
                                "limit_exceeded",
                                {
                                    "provider": "OpenRouter",
                                    "reason": "daily_free_limit",
                                    "message": "OpenRouter daily free requests limit reached (free-models-per-day). Resets at 00:00 UTC.",
                                    "alternative": "gemini-3.5-flash-lite",
                                },
                            )
                        for tc in getattr(last, "tool_calls", []) or []:
                            steps += 1
                            print(f"[STEP] {tc['name']} {tc['args']}")
                            yield sse("step", {"tool": tc["name"], "args": tc["args"]})
                        um = getattr(last, "usage_metadata", None)
                        if um:
                            for k in usage:
                                usage[k] += um.get(k, 0)

            yield sse(
                "done",
                {
                    "seconds": round(time.time() - t0, 1),
                    "steps": steps,
                    "usage": usage,
                },
            )

            # 3. Flush Langfuse traces to cloud
            if get_langfuse_client:
                try:
                    get_langfuse_client().flush()
                except Exception:
                    pass
            elif langfuse_handler and hasattr(langfuse_handler, "flush"):
                try:
                    langfuse_handler.flush()
                except Exception:
                    pass

        except Exception as e:
            traceback.print_exc()
            err_text = str(e)

            # 1. Google 503 High Demand Spikes
            if "503" in err_text or "UNAVAILABLE" in err_text or "high demand" in err_text.lower():
                yield sse(
                    "limit_exceeded",
                    {
                        "provider": "Google",
                        "reason": "upstream_high_demand",
                        "message": "Google Gemini 3.5 Flash is currently experiencing a temporary high demand spike upstream. Switch to Gemini 3.5 Flash Lite for instant responses.",
                        "alternative": "gemini-3.5-flash-lite",
                    },
                )
                msg = "Google Gemini 3.5 Flash is currently experiencing high demand upstream. Click the banner below to switch to Gemini 3.5 Flash Lite."
                yield sse("error", msg)

            # 2. Google Daily Quota Limits
            elif "RESOURCE_EXHAUSTED" in err_text or "Quota exceeded" in err_text:
                model_name = body.model or "gemini-3.5-flash"
                yield sse(
                    "limit_exceeded",
                    {
                        "provider": "Google",
                        "reason": "daily_free_limit",
                        "message": f"Daily quota limit exceeded for '{model_name}'. Switch to Gemini 3.5 Flash Lite for high limits.",
                        "alternative": "gemini-3.5-flash-lite",
                    },
                )
                msg = f"Quota exceeded for {model_name}. Please switch to Google Gemini 3.5 Flash Lite to continue chatting."
                yield sse("error", msg)

            # 3. OpenRouter Free Tier Limit
            elif "free-models-per-day" in err_text:
                yield sse(
                    "limit_exceeded",
                    {
                        "provider": "OpenRouter",
                        "reason": "daily_free_limit",
                        "message": "OpenRouter daily free requests limit reached (free-models-per-day). Resets at 00:00 UTC.",
                        "alternative": "gemini-3.5-flash-lite",
                    },
                )
                msg = "Daily Free Quota Exceeded on OpenRouter. Your Google Gemini key is active—click the banner below to switch to Gemini 3.5 Flash Lite!"
                yield sse("error", msg)

            # 4. Upstream Rate Limiting
            elif (
                "429" in err_text
                or "rate-limited" in err_text.lower()
                or "TooManyRequests" in type(e).__name__
            ):
                model_name = body.model or settings.default_model
                yield sse(
                    "limit_exceeded",
                    {
                        "provider": "Google" if "gemini" in str(model_name).lower() else "OpenRouter",
                        "reason": "upstream_rate_limited",
                        "message": f"Model '{model_name}' is temporarily rate-limited upstream.",
                        "alternative": "gemini-3.5-flash-lite",
                    },
                )
                msg = f"The model '{model_name}' is temporarily rate-limited upstream. Switch to Google Gemini 3.5 Flash Lite to continue."
                yield sse("error", msg)
            else:
                yield sse("error", f"{type(e).__name__}: {e}")

    return StreamingResponse(gen(), media_type="text/event-stream")