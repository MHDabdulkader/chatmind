import traceback
from langchain.agents import create_agent
from langgraph.checkpoint.memory import InMemorySaver

from app.core.llm import get_model
from app.core.tools import ALL_TOOLS, search_docs


def run(name, **kw):
    print(f"\n--- {name}")
    try:
        agent = create_agent(get_model(), **kw)
        res = agent.invoke(
            {"messages": [{"role": "user", "content": "How much is the Pro plan?"}]},
            {"configurable": {"thread_id": name}},
        )
        print("OK:", str(res["messages"][-1].content)[:100])
    except BaseException:
        lines = traceback.format_exc().splitlines()
        print("\n".join(lines[:14] + ["   ..."] + lines[-14:]))  # recursion traces are huge


run("1_no_tools", tools=[])
run("2_one_tool", tools=[search_docs])
run("3_all_tools", tools=ALL_TOOLS)
run("4_with_saver", tools=ALL_TOOLS, checkpointer=InMemorySaver())