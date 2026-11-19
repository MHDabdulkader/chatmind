import pytest
from app.core import rag

def test_rag_twostage_rerank():
    chunks = [
        "Python is an interpreted, high-level, general-purpose programming language created by Guido van Rossum.",
        "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France.",
        "Machine learning is a field of artificial intelligence devoted to building algorithms that improve through experience.",
        "Paris is the official capital and most populous metropolis of France, located along the river Seine.",
    ]

    for i, c in enumerate(chunks):
        rag.add_document(c, source=f"fact_{i}.txt", project_id="unit_test_proj", doc_id=f"test_doc_{i}")

    try:
        results = rag.search("Tell me about the capital city of France", k=2, project_id="unit_test_proj")
        assert len(results) > 0
        top_doc, top_score = results[0]
        # Verify that Paris capital document is ranked #1
        assert "Paris is the official capital" in top_doc.page_content
        assert "rerank_score" in top_doc.metadata
    finally:
        for i in range(len(chunks)):
            rag.delete_document(f"test_doc_{i}")
