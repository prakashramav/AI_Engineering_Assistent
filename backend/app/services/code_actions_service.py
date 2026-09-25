import os
from sqlalchemy.orm import Session
from ..db.models import Repo
from .llm_service import llm_service

class CodeActionsService:
    def _read_file_content(self, repo_id: int, file_path: str, db: Session) -> str:
        repo = db.query(Repo).filter(Repo.id == repo_id).first()
        if not repo or not repo.local_path:
            raise ValueError(f"Repository {repo_id} local directory not available.")

        abs_path = os.path.join(repo.local_path, file_path.replace("/", os.sep))
        if not os.path.exists(abs_path):
            raise FileNotFoundError(f"File {file_path} not found in repository.")

        with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()

    async def explain_file(self, repo_id: int, file_path: str, db: Session) -> str:
        content = self._read_file_content(repo_id, file_path, db)
        return await llm_service.explain_code(file_path, content)

    async def generate_tests(self, repo_id: int, file_path: str, symbol_name: str, db: Session) -> str:
        content = self._read_file_content(repo_id, file_path, db)
        return await llm_service.generate_tests(file_path, symbol_name or os.path.basename(file_path), content)

    async def generate_docs(self, repo_id: int, file_path: str, db: Session) -> str:
        content = self._read_file_content(repo_id, file_path, db)
        return await llm_service.generate_docs(file_path, content)


code_actions_service = CodeActionsService()

def get_code_actions_service() -> CodeActionsService:
    return code_actions_service
