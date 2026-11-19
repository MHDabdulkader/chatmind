"""
Interactive Demo: Standard Vector Search vs. FlashRank 2-Stage Reranker
"""

from app.core import rag

def run_demo():
    print("=" * 75)
    print(" 🚀 ChatMind: 2-Stage Retrieval & FlashRank Local Reranker Test")
    print("=" * 75)

    sample_docs = [
        ("doc_1", "python_intro.txt", "Python is an interpreted, high-level, general-purpose programming language."),
        ("doc_2", "france_geography.txt", "The Eiffel Tower is a famous wrought-iron lattice tower located on Champ de Mars in Paris."),
        ("doc_3", "machine_learning.txt", "Machine learning algorithms build mathematical models based on sample training data."),
        ("doc_4", "france_capital.txt", "Paris is the official capital city and economic powerhouse of France."),
        ("doc_5", "fastapi_guide.txt", "FastAPI is a high-performance Python framework designed for building modern async REST APIs."),
    ]

    print("\n[Step 1] Indexing 5 sample chunks into ChromaDB...")
    for doc_id, filename, text in sample_docs:
        rag.add_document(text, source=filename, project_id="demo_test", doc_id=doc_id)

    query = "What is the capital city of France?"
    print(f"\n[Step 2] Testing Query: \"{query}\"")
    print("-" * 75)

    # 1. Without rerank (Stage 1 Vector Search only)
    print("\n🔹 Stage 1 (Vector Search only - ChromaDB BGE Embeddings):")
    vec_results = rag.search(query, k=3, project_id="demo_test", rerank=False)
    for rank, (doc, dist) in enumerate(vec_results, 1):
        print(f"   Rank #{rank} | Vector Distance: {dist:.4f} | Source: {doc.metadata.get('source'):<22} | Snippet: {doc.page_content}")

    # 2. With 2-Stage Rerank (FlashRank TinyBERT Cross-Encoder)
    print("\n🔥 Stage 2 (FlashRank Local Cross-Encoder Reranked):")
    rerank_results = rag.search(query, k=3, project_id="demo_test", rerank=True)
    for rank, (doc, score) in enumerate(rerank_results, 1):
        print(f"   Rank #{rank} | Cross-Encoder Score: {score:.4f} | Source: {doc.metadata.get('source'):<22} | Snippet: {doc.page_content}")

    # Clean up
    for doc_id, _, _ in sample_docs:
        rag.delete_document(doc_id)

    print("\n" + "=" * 75)
    print("✅ Test Completed! Chunks cleaned up.")
    print("=" * 75)

if __name__ == "__main__":
    run_demo()
