# test_search2.py
from ddgs import DDGS

q = "latest stable Python version"
for region in ["us-en", "wt-wt", "uk-en"]:
    for b in ["auto", "google", "duckduckgo"]:
        try:
            r = DDGS().text(q, max_results=3, backend=b, region=region)
            print(f"\n{region} / {b}: {len(r)} hits")
            for h in r:
                print("  ", h["title"][:60], "|", h["href"][:60])
        except Exception as e:
            print(f"\n{region} / {b}: FAIL {type(e).__name__}")