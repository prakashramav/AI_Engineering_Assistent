import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db.session import init_db
from .routers import repos, files, qa, analysis, pr

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database tables
    logger.info("Initializing Engineering Assistant database tables...")
    init_db()
    logger.info(f"Database initialized. Vector DB path: {settings.VECTOR_DB_PATH}")
    yield
    # Shutdown
    logger.info("Engineering Assistant backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Full-stack AI Software Engineering Assistant developer platform with code understanding, tree-sitter chunking, RAG Q&A, and PR reviews.",
    lifespan=lifespan,
)

# CORS configuration allowing local dev and all deployed frontends (Vercel, Render, Netlify)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "https://ai-engineering-assistent-gen-ai.onrender.com",
    ],
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include Routers
app.include_router(repos.router, prefix=settings.API_V1_STR)
app.include_router(files.router, prefix=settings.API_V1_STR)
app.include_router(qa.router, prefix=settings.API_V1_STR)
app.include_router(analysis.router, prefix=settings.API_V1_STR)
app.include_router(pr.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR,
    }

@app.get("/api/health")
def healthcheck():
    return {
        "status": "healthy",
        "llm_configured": bool(settings.GEMINI_API_KEY),
        "mock_mode": settings.MOCK_LLM,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
