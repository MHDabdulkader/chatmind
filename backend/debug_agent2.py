import traceback
from langchain.agents import create_agent
from langchain.agents.middleware import (
    ModelCallLimitMiddleware, ModelRetryMiddleware, ToolRetryMiddleware,
)
from langgraph.checkpoint.memory import InMemorySaver

from app.core.llm import get_model
from app.core.tools import ALL_TOOLS

MSG = {"messages": [{"role": "user", "content": "How much is the Pro plan?"}]}


def short_trace():
    lines = traceback.format_exc().splitlines()
    print("\n".join(lines[:10] + ["   ..."] + lines[-12:]))


def try_invoke(name, middleware):
    print(f"\n--- invoke: {name}")
    try:
        agent = create_agent(get_model(), tools=ALL_TOOLS, middleware=middleware,
                             checkpointer=InMemorySaver())
        res = agent.invoke(MSG, {"configurable": {"thread_id": name}})
        print("OK:", str(res["messages"][-1].content)[:80])
    except BaseException:
        short_trace()


try_invoke("model_retry", [ModelRetryMiddleware(max_retries=3)])
try_invoke("tool_retry", [ToolRetryMiddleware(max_retries=2)])
try_invoke("call_limit", [ModelCallLimitMiddleware(run_limit=8, exit_behavior="end")])

# stream modes, no middleware
agent = create_agent(get_model(), tools=ALL_TOOLS, checkpointer=InMemorySaver())
for mode in ["updates", "messages", ["messages", "updates"]]:
    print(f"\n--- stream: {mode}")
    try:
        n = 0
        for _ in agent.stream(MSG, {"configurable": {"thread_id": f"s{n}{mode}"}}, stream_mode=mode):
            n += 1
        print(f"OK: {n} events")
    except BaseException:
        short_trace()