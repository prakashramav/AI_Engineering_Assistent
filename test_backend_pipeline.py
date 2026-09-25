import asyncio
from backend.app.db.session import init_db, SessionLocal
from backend.app.db.models import Repo
from backend.app.services.indexing_service import indexing_service
from backend.app.services.qa_service import qa_service
from backend.app.services.bug_service import bug_service
from backend.app.services.pr_service import pr_service
from backend.app.services.graph_service import graph_service
from backend.app.db.models import FileRecord, DependencyGraphEdge

async def main():
    print("1. Initializing DB...")
    init_db()
    db = SessionLocal()

    print("2. Registering test repo...")
    repo = Repo(
        github_url="https://github.com/developer/ai-sample-service",
        owner="developer",
        name="ai-sample-service",
        status="pending",
        status_message="Ready for test indexing",
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)

    print(f"3. Running indexing pipeline for repo {repo.id}...")
    await indexing_service.index_repository(repo.id)
    db.refresh(repo)
    print(f"   Repo status: {repo.status}, Total files: {repo.total_files}, Total chunks: {repo.total_chunks}")
    assert repo.status == "ready", "Repo should be ready"

    print("4. Testing Codebase Q&A (RAG + hybrid search)...")
    qa_res = await qa_service.answer_question(repo.id, "Why might authenticateToken fail with 401?", db)
    print(f"   Q&A Answer excerpt:\n   {qa_res['answer'][:150]}...")
    print(f"   Cited chunks count: {len(qa_res['cited_chunks'])}")
    assert len(qa_res["cited_chunks"]) > 0, "Should have cited chunks"

    print("5. Testing Bug Detection...")
    bugs = await bug_service.scan_repo(repo.id, db)
    print(f"   Detected {len(bugs)} bug findings.")
    for b in bugs[:2]:
        print(f"   - [{b['severity']}] {b['title']} at {b['file_path']}:{b['line_range']}")

    print("6. Testing PR Review Pipeline...")
    pr_res = await pr_service.review_pr(repo.id, 1, db)
    print(f"   PR Risk Level: {pr_res['risk_level']}")
    print(f"   PR Comments count: {len(pr_res['comments'])}")

    print("7. Testing Architecture Graph Extraction...")
    files = db.query(FileRecord).filter(FileRecord.repo_id == repo.id).all()
    edges = db.query(DependencyGraphEdge).filter(DependencyGraphEdge.repo_id == repo.id).all()
    graph = graph_service.build_graph(files, edges)
    print(f"   Graph nodes: {len(graph['nodes'])}, edges: {len(graph['edges'])}")

    db.close()
    print("\n>>> ALL BACKEND PIPELINES SUCCEEDED! <<<")

if __name__ == "__main__":
    asyncio.run(main())
