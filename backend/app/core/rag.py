import os
import hashlib

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings

_embeddings = None
_store = None

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

splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)

def add_document(text: str, source: str, project_id: str = "default", doc_id: str = "") -> int:
    store = get_store()
    chunks = splitter.split_text(text)
    ids = [hashlib.md5((doc_id + source + c).encode("utf-8")).hexdigest() for c in chunks]

    metas = [{"source": source, "project": project_id, "doc_id": doc_id} for _ in chunks]
    store.add_texts(chunks, metadatas=metas, ids=ids)
    print(f"[RAG] indexed {source}: {len(chunks)} chunks")
    return len(chunks)

def search(query: str, k: int = 4, project_id: str | None = None):
    store = get_store()
    flt = {"project": project_id} if project_id else None
    return store.similarity_search_with_score(query, k=k, filter=flt)

def delete_document(doc_id: str) -> None:
    store = get_store()
    store._collection.delete(where={"doc_id": doc_id})
    print(f"[RAG] deleted chunks for doc {doc_id[:8]}")