import json
import asyncio
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..db.models import Repo, FileRecord, DependencyGraphEdge, Dependency, CommitSummary
from ..services.github_service import github_service
from ..services.indexing_service import (
    indexing_service,
    get_repo_event_queue,
    remove_repo_event_queue,
)
from ..services.graph_service import graph_service

router = APIRouter(prefix="/repos", tags=["Repositories"])

class ConnectRepoRequest(BaseModel):
    github_url: str
    token: Optional[str] = None

class ConnectRepoResponse(BaseModel):
    id: int
    github_url: str
    owner: str
    name: str
    status: str
    message: str

@router.post("/connect", response_model=ConnectRepoResponse)
async def connect_repo(
    req: ConnectRepoRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    try:
        owner, repo_name = github_service.parse_repo_url(req.github_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Look up existing or create new
    existing = db.query(Repo).filter(Repo.github_url == req.github_url).first()
    if existing:
        repo = existing
        repo.status = "cloning"
        repo.status_message = "Re-initiating indexing pipeline..."
        repo.indexing_progress = 5.0
    else:
        repo = Repo(
            github_url=req.github_url,
            owner=owner,
            name=repo_name,
            status="pending",
            status_message="Repository registered. Starting indexing...",
            indexing_progress=0.0,
        )
        db.add(repo)

    db.commit()
    db.refresh(repo)

    # Queue indexing in background
    background_tasks.add_task(indexing_service.index_repository, repo.id, incremental=False)

    return ConnectRepoResponse(
        id=repo.id,
        github_url=repo.github_url,
        owner=repo.owner,
        name=repo.name,
        status=repo.status,
        message="Indexing started in background.",
    )

@router.get("", response_model=List[dict])
def list_repositories(db: Session = Depends(get_db)):
    repos = db.query(Repo).order_by(Repo.updated_at.desc()).all()
    return [
        {
            "id": r.id,
            "github_url": r.github_url,
            "owner": r.owner,
            "name": r.name,
            "status": r.status,
            "status_message": r.status_message,
            "indexing_progress": r.indexing_progress,
            "total_files": r.total_files,
            "total_chunks": r.total_chunks,
            "languages": r.languages,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in repos
    ]

@router.get("/{id}")
def get_repository(id: int, db: Session = Depends(get_db)):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return {
        "id": repo.id,
        "github_url": repo.github_url,
        "owner": repo.owner,
        "name": repo.name,
        "default_branch": repo.default_branch,
        "status": repo.status,
        "status_message": repo.status_message,
        "indexing_progress": repo.indexing_progress,
        "languages": repo.languages,
        "architecture_summary": repo.architecture_summary,
        "entry_points": repo.entry_points,
        "total_files": repo.total_files,
        "total_chunks": repo.total_chunks,
        "last_indexed_sha": repo.last_indexed_sha,
        "updated_at": repo.updated_at.isoformat() if repo.updated_at else None,
    }

@router.get("/{id}/index-status")
async def get_index_status(
    id: int,
    request: Request,
    stream: bool = False,
    db: Session = Depends(get_db),
):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    accept_header = request.headers.get("accept", "")
    wants_sse = stream or "text/event-stream" in accept_header

    if not wants_sse:
        return {
            "id": repo.id,
            "status": repo.status,
            "status_message": repo.status_message,
            "progress": repo.indexing_progress,
            "total_files": repo.total_files,
            "total_chunks": repo.total_chunks,
        }

    # Stream SSE
    async def event_generator():
        q = get_repo_event_queue(id)
        # Send initial state
        initial_data = json.dumps({
            "step": repo.status,
            "percent": repo.indexing_progress,
            "message": repo.status_message,
            "total_files": repo.total_files,
            "total_chunks": repo.total_chunks,
        })
        yield f"data: {initial_data}\n\n"

        if repo.status in ("ready", "failed"):
            remove_repo_event_queue(id, q)
            return

        try:
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=20.0)
                    yield f"data: {json.dumps(event)}\n\n"
                    if event.get("step") in ("ready", "failed"):
                        break
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat
                    yield f": heartbeat\n\n"
        finally:
            remove_repo_event_queue(id, q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

@router.get("/{id}/overview")
def get_repo_overview(id: int, db: Session = Depends(get_db)):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Dependency overview
    deps = db.query(Dependency).filter(Dependency.repo_id == id).all()
    vuln_count = sum(1 for d in deps if d.vulnerability_flag)

    return {
        "repo_id": repo.id,
        "name": repo.name,
        "owner": repo.owner,
        "languages": repo.languages or {},
        "architecture_summary": repo.architecture_summary or "Architecture analysis underway.",
        "entry_points": repo.entry_points or [],
        "total_files": repo.total_files,
        "total_chunks": repo.total_chunks,
        "total_dependencies": len(deps),
        "vulnerable_dependencies": vuln_count,
        "status": repo.status,
        "last_indexed_sha": repo.last_indexed_sha,
    }

@router.get("/{id}/architecture")
def get_architecture_graph(id: int, db: Session = Depends(get_db)):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    files = db.query(FileRecord).filter(FileRecord.repo_id == id).all()
    edges = db.query(DependencyGraphEdge).filter(DependencyGraphEdge.repo_id == id).all()

    return graph_service.build_graph(files, edges)

@router.get("/{id}/dependencies")
def get_dependencies(id: int, db: Session = Depends(get_db)):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    deps = db.query(Dependency).filter(Dependency.repo_id == id).all()
    return [
        {
            "id": d.id,
            "package_name": d.package_name,
            "current_version": d.current_version,
            "latest_version": d.latest_version,
            "vulnerability_flag": d.vulnerability_flag,
            "severity": d.severity,
            "advisory_summary": d.advisory_summary,
            "ecosystem": d.ecosystem,
            "manifest_path": d.manifest_path,
        }
        for d in deps
    ]

@router.get("/{id}/commits")
def get_commits(id: int, db: Session = Depends(get_db)):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    commits = db.query(CommitSummary).filter(CommitSummary.repo_id == id).order_by(CommitSummary.id.desc()).all()
    return [
        {
            "sha": c.commit_sha,
            "message": c.message,
            "author": c.author,
            "date": c.date,
            "ai_summary": c.ai_summary,
        }
        for c in commits
    ]

@router.post("/{id}/resync")
async def resync_repository(
    id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    repo = db.query(Repo).filter(Repo.id == id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    repo.status = "cloning"
    repo.status_message = "Fetching diff and syncing new commits..."
    repo.indexing_progress = 15.0
    db.commit()

    background_tasks.add_task(indexing_service.index_repository, repo.id, incremental=True)
    return {"message": "Incremental re-indexing started in background."}
