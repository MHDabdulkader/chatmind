from ddgs import DDGS

for b in ["auto", "duckduckgo", "bing", "brave", "yahoo", "mojeek", "google", "yandex", "wikipedia"]:
    try:
        r = DDGS().text("latest stable Python version", max_results=3, backend=b)
        print(f"{b:12} OK   {len(r)} hits  {r[0]['href'] if r else ''}")
    except Exception as e:
        print(f"{b:12} FAIL {type(e).__name__}: {str(e)[:60]}")