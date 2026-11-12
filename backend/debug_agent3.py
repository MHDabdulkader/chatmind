import traceback

from app.core.agent import get_agent
from app.api.chat import chat
from app.schemas import ChatIn


def short_trace():
    lines = traceback.format_exc().splitlines()
    print("\n".join(lines[:10] + ["   ..."] + lines[-14:]))


MSG = {"messages": [{"role": "user", "content": "How much is the Pro plan?"}]}

print("\n--- A: real agent (agent.py), invoke")
try:
    res = get_agent().invoke(MSG, {"configurable": {"thread_id": "a"}})
    print("OK:", str(res["messages"][-1].content)[:80])
except BaseException:
    short_trace()

print("\n--- B: real chat() generator, no HTTP")
try:
    resp = chat(ChatIn(message="How much is the Pro plan?", thread_id="b"))
    for piece in resp.body_iterator:
        print(piece.strip()[:100])
except BaseException:
    short_trace()