import asyncio
import traceback

from app.core.agent import get_agent
from app.api.chat import chat
from app.schemas import ChatIn

MSG = {"messages": [{"role": "user", "content": "How much is the Pro plan?"}]}


def short_trace():
    lines = traceback.format_exc().splitlines()
    print("\n".join(lines[-16:]))


# 1: real agent (with middleware) in each stream mode
agent = get_agent()
for mode in ["updates", "messages", ["messages", "updates"]]:
    print(f"\n--- stream: {mode}")
    try:
        n = sum(1 for _ in agent.stream(
            MSG, {"configurable": {"thread_id": f"x{mode}"}}, stream_mode=mode))
        print(f"OK: {n} events")
    except BaseException:
        short_trace()


# 2: the real endpoint, consumed the way Starlette does (async)
async def run_chat():
    resp = chat(ChatIn(message="How much is the Pro plan?", thread_id="b"))
    async for piece in resp.body_iterator:
        print(piece.strip()[:100])

print("\n--- real chat() generator")
asyncio.run(run_chat())