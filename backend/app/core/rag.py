import os
import hashlib

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings

_embeddings = None
_store = None
_ranker = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        print(f"[RAG] Loading embedding model: {settings.embedding_model}...")
        _embeddings = HuggingFaceEmbeddings(model_name=settings.embedding_model)
    return _embeddings

def get_store():
    global _store
    if _store is None:
        os.makedirs(settings.chroma_dir, exist_ok=True)
        _store = Chroma(
            collection_name="docs",
            embedding_function=get_embeddings(),
            persist_directory=settings.chroma_dir
        )
    return _store

def get_ranker():
    global _ranker
    if not getattr(settings, "rerank_enabled", True):
        return None
    if _ranker is None:
        try:
            from flashrank import Ranker
            model_name = getattr(settings, "reranker_model", "ms-marco-TinyBERT-L-2-v2")
            print(f"[RAG] Initializing FlashRank local cross-encoder ({model_name})...")
            _ranker = Ranker(model_name=model_name)
        except Exception as e:
            print(f"[RAG] FlashRank initialization failed ({e}); falling back to standard vector search")
            _ranker = False
    return _ranker if _ranker is not False else None

splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)

def add_document(text: str, source: str, project_id: str = "default", doc_id: str = "") -> int:
    store = get_store()
    chunks = splitter.split_text(text)
    ids = [hashlib.md5((doc_id + source + c).encode("utf-8")).hexdigest() for c in chunks]

    metas = [{"source": source, "project": project_id, "doc_id": doc_id} for _ in chunks]
    store.add_texts(chunks, metadatas=metas, ids=ids)
    print(f"[RAG] indexed {source}: {len(chunks)} chunks")
    return len(chunks)

def search(query: str, k: int = 4, project_id: str | None = None, rerank: bool = True):
    store = get_store()
    flt = {"project": project_id} if project_id else None

    ranker = get_ranker() if rerank else None
    if not ranker:
        return store.similarity_search_with_score(query, k=k, filter=flt)

    # Stage 1: Broad candidate retrieval via dense vector search
    fetch_k = max(k * 3, 12)
    candidates = store.similarity_search_with_score(query, k=fetch_k, filter=flt)
    if not candidates:
        return []

    # Stage 2: Cross-encoder re-ranking with FlashRank
    try:
        from flashrank import RerankRequest

        passages = [
            {"id": i, "text": doc.page_content, "meta": doc.metadata}
            for i, (doc, _) in enumerate(candidates)
        ]

        req = RerankRequest(query=query, passages=passages)
        reranked = ranker.rerank(req)

        results = []
        for item in reranked[:k]:
            idx = item["id"]
            doc, _ = candidates[idx]
            score = float(item.get("score", 0.0))
            doc.metadata["rerank_score"] = score
            results.append((doc, score))

        top_score = results[0][1] if results else 0.0
        print(f"[RAG] 2-Stage Retrieval: Fetched {len(candidates)} vector candidates -> FlashRank reranked top {len(results)} (top score: {top_score:.4f})")
        return results
    except Exception as e:
        print(f"[RAG] FlashRank reranking error ({e}); falling back to top vector candidates")
        return candidates[:k]

def delete_document(doc_id: str) -> None:
    store = get_store()
    store._collection.delete(where={"doc_id": doc_id})
    print(f"[RAG] deleted chunks for doc {doc_id[:8]}")

def __getattr__(name):
    if name == "store":
        return get_store()
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")
