from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from ..db.session import get_db
from ..db.models import Repo, QAHistory
from ..services.qa_service import qa_service

router = APIRouter(prefix="/repos/{id}", tags=["Codebase Q&A"])

class AskQuestionRequest(BaseModel):
    question: str

class QAResponse(BaseModel):
    id: int
    question: str
    answer: str
    cited_chunks: List[Dict[str, Any]]
    created_at: str

@router.post("/ask", response_model=QAResponse)
async def ask_question(
    id: int,
    req: AskQuestionRequest,
    db: Session = Depends(get_db),
):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        result = await qa_service.answer_question(id, req.question, db)
        return QAResponse(
            id=result["id"],
            question=result["question"],
            answer=result["answer"],
            cited_chunks=result["cited_chunks"],
            created_at=result["created_at"] or "",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/qa/history")
def get_qa_history(id: int, db: Session = Depends(get_db)):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    items = db.query(QAHistory).filter(QAHistory.repo_id == id).order_by(QAHistory.id.desc()).all()
    return [
        {
            "id": h.id,
            "question": h.question,
            "answer": h.answer,
            "cited_chunks": h.cited_chunks or [],
            "created_at": h.created_at.isoformat() if h.created_at else None,
        }
        for h in items
    ]
