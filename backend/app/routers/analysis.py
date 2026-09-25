from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..db.models import Repo
from ..services.bug_service import bug_service

router = APIRouter(prefix="/repos/{id}", tags=["Analysis & Bug Detection"])

class AnalyzeBugsRequest(BaseModel):
    file_path: Optional[str] = None

@router.post("/analyze-bugs")
async def analyze_bugs(
    id: int,
    req: AnalyzeBugsRequest,
    db: Session = Depends(get_db),
):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    try:
        if req.file_path:
            findings = await bug_service.scan_file(id, req.file_path, db)
        else:
            findings = await bug_service.scan_repo(id, db)
        return {"total_findings": len(findings), "findings": findings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bugs")
def list_bugs(
    id: int,
    file_path: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    findings = bug_service.get_findings(id, file_path, db)
    return findings
