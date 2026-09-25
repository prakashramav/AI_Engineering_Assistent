import re
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from ..db.models import Repo, CodeChunk, QAHistory, DependencyGraphEdge
from .embedding_service import embedding_service
from .vector_store import vector_store
from .llm_service import llm_service

logger = logging.getLogger(__name__)

class QAService:
    """
    Hybrid Code Retrieval (Vector Similarity + Symbol/Keyword Boost)
    with Caller/Callee context and strict source line citations.
    """

    async def answer_question(self, repo_id: int, question: str, db: Session) -> Dict[str, Any]:
        # 1. Vector Search
        query_embedding = embedding_service.embed_query(question)
        vector_results = vector_store.query(repo_id=repo_id, query_embedding=query_embedding, top_k=6)

        # 2. Keyword & Symbol-Name Boost (Hybrid Retrieval)
        # Extract potential identifiers (camelCase, snake_case, or words >= 3 chars)
        potential_symbols = re.findall(r"[A-Za-z_][A-Za-z0-9_]{2,}", question)
        keyword_chunks: List[CodeChunk] = []

        if potential_symbols:
            for sym in potential_symbols[:4]:
                matches = db.query(CodeChunk).filter(
                    CodeChunk.repo_id == repo_id,
                    (CodeChunk.symbol_name.ilike(f"%{sym}%")) | (CodeChunk.file_path.ilike(f"%{sym}%"))
                ).limit(3).all()
                for m in matches:
                    if m not in keyword_chunks:
                        keyword_chunks.append(m)

        # Combine results, prioritizing exact symbol matches
        retrieved_items = []
        seen_chunk_ids = set()

        # Add keyword boosted matches first
        for kc in keyword_chunks:
            seen_chunk_ids.add(str(kc.id))
            retrieved_items.append({
                "id": str(kc.id),
                "document": kc.content,
                "metadata": {
                    "file_path": kc.file_path,
                    "symbol_name": kc.symbol_name or "",
                    "symbol_type": kc.symbol_type,
                    "start_line": kc.start_line,
                    "end_line": kc.end_line,
                },
                "similarity": 0.95,
                "boosted": True,
            })

        # Add vector results
        for vr in vector_results:
            c_id = vr.get("id")
            if c_id not in seen_chunk_ids:
                seen_chunk_ids.add(c_id)
                retrieved_items.append(vr)

        # 3. Call Graph Context (for "why is X failing", "how does Y call Z")
        call_graph_context = ""
        is_failure_inquiry = any(term in question.lower() for term in ["why", "fail", "error", "broken", "trace", "call", "caller"])
        
        if is_failure_inquiry and retrieved_items:
            top_file = retrieved_items[0].get("metadata", {}).get("file_path", "")
            if top_file:
                # Find direct callers and callees
                callers = db.query(DependencyGraphEdge).filter(
                    DependencyGraphEdge.repo_id == repo_id,
                    DependencyGraphEdge.to_module.ilike(f"%{top_file}%")
                ).limit(3).all()
                
                callees = db.query(DependencyGraphEdge).filter(
                    DependencyGraphEdge.repo_id == repo_id,
                    DependencyGraphEdge.from_module.ilike(f"%{top_file}%")
                ).limit(3).all()

                lines = []
                if callers:
                    lines.append(f"Modules that import/call `{top_file}`: " + ", ".join([c.from_module for c in callers]))
                if callees:
                    lines.append(f"Modules called/imported by `{top_file}`: " + ", ".join([c.to_module for c in callees]))
                call_graph_context = "\n".join(lines)

        # 4. Synthesize with Gemini LLM
        llm_result = await llm_service.answer_qa(
            question=question,
            retrieved_chunks=retrieved_items[:6],
            call_graph_context=call_graph_context,
        )

        # 5. Persist QA History
        qa_record = QAHistory(
            repo_id=repo_id,
            question=question,
            answer=llm_result["answer"],
            cited_chunks=llm_result["cited_chunks"],
        )
        db.add(qa_record)
        db.commit()
        db.refresh(qa_record)

        return {
            "id": qa_record.id,
            "question": question,
            "answer": llm_result["answer"],
            "cited_chunks": llm_result["cited_chunks"],
            "created_at": qa_record.created_at.isoformat() if qa_record.created_at else None,
        }


qa_service = QAService()

def get_qa_service() -> QAService:
    return qa_service
