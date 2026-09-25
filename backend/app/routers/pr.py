from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from ..db.session import get_db
from ..db.models import Repo, PRReview
from ..services.github_service import github_service
from ..services.pr_service import pr_service

router = APIRouter(prefix="/repos/{id}", tags=["PR Reviews"])

class PostCommentRequest(BaseModel):
    comment: str

@router.get("/prs")
async def list_pull_requests(id: int, db: Session = Depends(get_db)):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    prs = await github_service.get_pull_requests(repo.owner, repo.name)
    return prs

@router.post("/pr/{number}/review")
async def review_pull_request(id: int, number: int, db: Session = Depends(get_db)):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    try:
        review = await pr_service.review_pr(id, number, db)
        return review
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pr/{number}")
def get_pr_review(id: int, number: int, db: Session = Depends(get_db)):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    rev = db.query(PRReview).filter(
        PRReview.repo_id == id,
        PRReview.pr_number == number
    ).first()

    if not rev:
        raise HTTPException(status_code=404, detail="Review not found for this PR")

    return {
        "id": rev.id,
        "pr_number": rev.pr_number,
        "pr_title": rev.pr_title,
        "summary": rev.summary,
        "risk_level": rev.risk_level,
        "diff": rev.diff_summary,
        "comments": rev.comments or [],
        "created_at": rev.created_at.isoformat() if rev.created_at else None,
    }

@router.post("/pr/{number}/comment")
async def post_pr_comment(
    id: int,
    number: int,
    req: PostCommentRequest,
    db: Session = Depends(get_db),
):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    success = await pr_service.post_review_to_github(id, number, req.comment, db)
    return {"success": success, "message": "Comment posted successfully"}
