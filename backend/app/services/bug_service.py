import os
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from ..db.models import Repo, FileRecord, BugFinding
from .llm_service import llm_service

logger = logging.getLogger(__name__)

class BugService:
    async def scan_file(self, repo_id: int, file_path: str, db: Session) -> List[Dict[str, Any]]:
        repo = db.query(Repo).filter(Repo.id == repo_id).first()
        if not repo or not repo.local_path:
            raise ValueError(f"Repository {repo_id} not found or local path unavailable.")

        abs_path = os.path.join(repo.local_path, file_path.replace("/", os.sep))
        if not os.path.exists(abs_path):
            raise FileNotFoundError(f"File {file_path} not found in repository.")

        with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
            code_content = f.read()

        findings = await llm_service.detect_bugs(file_path, code_content)

        # Clear existing findings for this file
        db.query(BugFinding).filter(
            BugFinding.repo_id == repo_id,
            BugFinding.file_path == file_path
        ).delete()

        saved = []
        for b in findings:
            bf = BugFinding(
                repo_id=repo_id,
                file_path=file_path,
                line_range=str(b.get("line_range", "1")),
                start_line=int(b.get("start_line", 1)),
                end_line=int(b.get("end_line", 1)),
                severity=b.get("severity", "medium"),
                category=b.get("category", "logic"),
                title=b.get("title", "Detected Issue"),
                description=b.get("description", ""),
                suggested_fix=b.get("suggested_fix", ""),
            )
            db.add(bf)
            saved.append(bf)

        db.commit()
        return [
            {
                "id": s.id,
                "file_path": s.file_path,
                "line_range": s.line_range,
                "start_line": s.start_line,
                "end_line": s.end_line,
                "severity": s.severity,
                "category": s.category,
                "title": s.title,
                "description": s.description,
                "suggested_fix": s.suggested_fix,
            }
            for s in saved
        ]

    async def scan_repo(self, repo_id: int, db: Session) -> List[Dict[str, Any]]:
        files = db.query(FileRecord).filter(FileRecord.repo_id == repo_id).limit(10).all()
        all_findings = []
        for f in files:
            try:
                res = await self.scan_file(repo_id, f.path, db)
                all_findings.extend(res)
            except Exception as e:
                logger.warning(f"Error scanning {f.path}: {e}")
        return all_findings

    def get_findings(self, repo_id: int, file_path: Optional[str], db: Session) -> List[Dict[str, Any]]:
        query = db.query(BugFinding).filter(BugFinding.repo_id == repo_id)
        if file_path:
            query = query.filter(BugFinding.file_path == file_path)
        items = query.order_by(BugFinding.id.desc()).all()
        return [
            {
                "id": s.id,
                "file_path": s.file_path,
                "line_range": s.line_range,
                "start_line": s.start_line,
                "end_line": s.end_line,
                "severity": s.severity,
                "category": s.category,
                "title": s.title,
                "description": s.description,
                "suggested_fix": s.suggested_fix,
            }
            for s in items
        ]


bug_service = BugService()

def get_bug_service() -> BugService:
    return bug_service
