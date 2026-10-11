import os
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from backend.app.database.models import KnowledgeDocument


class RAGEngine:
    """
    Retrieval-Augmented Generation (RAG) engine for fetching runbooks, K8s procedures,
    and past incident documentation to contextualize AI explanations with rapid fallback.
    """

    def __init__(self):
        self.chroma_client = None
        self.collection = None

    def retrieve_context(self, query: str, db: Session, top_k: int = 2) -> List[Dict[str, Any]]:
        # High performance keyword matching
        query_words = set(query.lower().split())
        all_docs = db.query(KnowledgeDocument).all()
        scored_docs = []
        for d in all_docs:
            doc_text = (d.title + " " + d.content + " " + " ".join(d.tags or [])).lower()
            doc_words = set(doc_text.split())
            score = len(query_words.intersection(doc_words))
            scored_docs.append((score, d))

        scored_docs.sort(key=lambda x: x[0], reverse=True)
        
        results = [
            {"title": d.title, "content": d.content}
            for score, d in scored_docs
        ]
        return results[:top_k] if results else [
            {"title": "Runbook: CPU Overload Mitigation", "content": "Scale deployment replicas from N to N+2 to relieve CPU saturation."}
        ]
