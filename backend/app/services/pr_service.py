import logging
import re
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from ..db.models import Repo, PRReview, CodeChunk
from .github_service import github_service
from .llm_service import llm_service

logger = logging.getLogger(__name__)

class PRService:
    async def review_pr(self, repo_id: int, pr_number: int, db: Session) -> Dict[str, Any]:
        repo = db.query(Repo).filter(Repo.id == repo_id).first()
        if not repo:
            raise ValueError(f"Repo {repo_id} not found.")

        # 1. Fetch PR Diff
        diff_text = await github_service.get_pr_diff(repo.owner, repo.name, pr_number)

        # 2. Extract modified files from diff header
        modified_files = re.findall(r"diff --git a/(\S+) b/\S+", diff_text)
        
        # 3. Retrieve related existing code for context
        related_code_snippets = []
        for mf in modified_files[:3]:
            chunks = db.query(CodeChunk).filter(
                CodeChunk.repo_id == repo_id,
                CodeChunk.file_path.ilike(f"%{mf}%")
            ).limit(2).all()
            for c in chunks:
                related_code_snippets.append(f"--- File: {c.file_path} ({c.symbol_name}) ---\n{c.content[:400]}")

        related_code_context = "\n".join(related_code_snippets)

        # 4. LLM Review Pass
        review_data = await llm_service.review_pr(
            pr_title=f"PR #{pr_number}",
            pr_diff=diff_text,
            related_code=related_code_context,
        )

        # 5. Save in database
        existing = db.query(PRReview).filter(
            PRReview.repo_id == repo_id,
            PRReview.pr_number == pr_number
        ).first()

        if existing:
            existing.summary = review_data.get("summary", "")
            existing.risk_level = review_data.get("risk_level", "low")
            existing.diff_summary = review_data.get("diff_summary", diff_text[:500])
            existing.comments = review_data.get("comments", [])
            db_item = existing
        else:
            db_item = PRReview(
                repo_id=repo_id,
                pr_number=pr_number,
                pr_title=f"Pull Request #{pr_number}",
                summary=review_data.get("summary", ""),
                risk_level=review_data.get("risk_level", "low"),
                diff_summary=review_data.get("diff_summary", diff_text[:500]),
                comments=review_data.get("comments", []),
            )
            db.add(db_item)

        db.commit()
        db.refresh(db_item)

        return {
            "id": db_item.id,
            "pr_number": db_item.pr_number,
            "pr_title": db_item.pr_title,
            "summary": db_item.summary,
            "risk_level": db_item.risk_level,
            "diff": diff_text,
            "comments": db_item.comments,
            "created_at": db_item.created_at.isoformat() if db_item.created_at else None,
        }

    async def post_review_to_github(self, repo_id: int, pr_number: int, comment: str, db: Session) -> bool:
        repo = db.query(Repo).filter(Repo.id == repo_id).first()
        if not repo:
            raise ValueError(f"Repo {repo_id} not found.")
        return await github_service.post_pr_comment(repo.owner, repo.name, pr_number, comment)


pr_service = PRService()

def get_pr_service() -> PRService:
    return pr_service
