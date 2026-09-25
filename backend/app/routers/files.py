import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..db.models import Repo, FileRecord, CodeChunk
from ..services.code_actions_service import code_actions_service

router = APIRouter(prefix="/repos/{id}/files", tags=["Files & Code Viewer"])

class ExplainRequest(BaseModel):
    file_path: str

class GenerateTestsRequest(BaseModel):
    file_path: str
    symbol_name: Optional[str] = None

class GenerateDocsRequest(BaseModel):
    file_path: str


@router.get("/tree")
def get_file_tree(id: int, db: Session = Depends(get_db)):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    files = db.query(FileRecord).filter(FileRecord.repo_id == id).all()

    # Build nested tree
    tree = {"name": repo.name, "type": "directory", "path": "", "children": []}

    def add_node(root_node, path_parts, file_rec):
        curr = root_node
        built_path = ""
        for i, part in enumerate(path_parts):
            built_path = f"{built_path}/{part}" if built_path else part
            is_file = (i == len(path_parts) - 1)
            
            existing = next((c for c in curr["children"] if c["name"] == part), None)
            if not existing:
                new_node = {
                    "name": part,
                    "type": "file" if is_file else "directory",
                    "path": built_path,
                    "children": [] if not is_file else None,
                    "language": file_rec.language if is_file else None,
                    "size": file_rec.size_bytes if is_file else None,
                }
                curr["children"].append(new_node)
                curr = new_node
            else:
                curr = existing

    for f in files:
        parts = f.path.replace("\\", "/").split("/")
        add_node(tree, parts, f)

    return tree


@router.get("/content")
def get_file_content(
    id: int,
    path: str = Query(..., description="Relative file path"),
    db: Session = Depends(get_db),
):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo or not repo.local_path:
        raise HTTPException(status_code=404, detail="Repository local files not available")

    norm_path = path.replace("/", os.sep)
    abs_path = os.path.join(repo.local_path, norm_path)
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail=f"File {path} not found")

    try:
        with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Retrieve chunks belonging to this file
    chunks = db.query(CodeChunk).filter(
        CodeChunk.repo_id == id,
        CodeChunk.file_path == path,
    ).all()

    return {
        "path": path,
        "content": content,
        "total_lines": len(content.splitlines()),
        "chunks": [
            {
                "symbol_name": c.symbol_name,
                "symbol_type": c.symbol_type,
                "start_line": c.start_line,
                "end_line": c.end_line,
            }
            for c in chunks
        ]
    }


@router.post("/explain")
async def explain_code(
    id: int,
    req: ExplainRequest,
    db: Session = Depends(get_db),
):
    try:
        explanation = await code_actions_service.explain_file(id, req.file_path, db)
        return {"file_path": req.file_path, "explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-tests")
async def generate_tests(
    id: int,
    req: GenerateTestsRequest,
    db: Session = Depends(get_db),
):
    try:
        tests = await code_actions_service.generate_tests(id, req.file_path, req.symbol_name or "", db)
        return {"file_path": req.file_path, "symbol_name": req.symbol_name, "test_code": tests}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-docs")
async def generate_docs(
    id: int,
    req: GenerateDocsRequest,
    db: Session = Depends(get_db),
):
    try:
        docs = await code_actions_service.generate_docs(id, req.file_path, db)
        return {"file_path": req.file_path, "documentation": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
