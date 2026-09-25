# AI Software Engineering Assistant Developer Platform

A full-stack, developer-first engineering intelligence platform that connects to GitHub repositories to provide deep code understanding, Tree-Sitter AST chunking, RAG codebase Q&A, bug detection, automated PR reviews, test/doc generation, dependency security audits, and interactive architecture visualization.

---

## 🛠️ Architecture & Tech Stack

```
   ┌─────────────────────────────────────────────────────────────┐
   │             Next.js 16 (App Router, JavaScript)             │
   │  - Prism Syntax Highlighter & Line Bug Gutters              │
   │  - Interactive React Flow Architecture Topology             │
   │  - Code Reference Chips (file_path:start-end)               │
   │  - Side-by-Side PR Diff Viewer with Inline Threaded AI      │
   │  - Mock / Live Backend Seamless Toggle                      │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ HTTP / SSE (/api)
   ┌──────────────────────────────▼──────────────────────────────┐
   │                    FastAPI Backend (Python)                 │
   │  - Tree-Sitter AST Parser (Python, JS, TS, JSON)            │
   │  - ChromaDB Local Vector Store (swappable BaseVectorStore)  │
   │  - Hybrid Retrieval: Vector Cosine + Symbol Keyword Boost   │
   │  - OSV API + Heuristic Security Vulnerability Auditing      │
   │  - Claude 3.5 Sonnet / Haiku Integration & Mock Fallback    │
   │  - SQLite / PostgreSQL with SQLAlchemy & Diff Re-indexing   │
   └─────────────────────────────────────────────────────────────┘
```

- **Frontend**: Next.js 16 (App Router), JavaScript, Tailwind CSS, Prism.js, `@xyflow/react` (React Flow), `lucide-react`.
- **Backend**: FastAPI (Python), async endpoints, background indexing tasks, SSE progress streams.
- **Code Parsing**: Tree-sitter AST parsing (`tree-sitter`, `tree-sitter-python`, `tree-sitter-javascript`, `tree-sitter-typescript`) for language-aware function, class, and import boundary extraction.
- **Vector Store**: ChromaDB with `BaseVectorStore` interface (cleanly swappable to Pinecone/Weaviate with one file change).
- **Embeddings**: Sentence-Transformers with deterministic semantic feature hashing fallback for zero-dependency offline resilience.
- **LLM Reasoning**: Google Gemini (via `google-genai` SDK, with Claude fallback) for Q&A, bug detection, PR review, test generation, and doc generation.
- **Database**: SQLAlchemy models for repositories, files, tree-sitter chunks, dependency graph edges, dependencies, bug findings, Q&A history, PR reviews, and commit summaries.

---

## 🚀 Quickstart & Local Setup

### 1. Backend Setup (FastAPI)

```bash
# Navigate to project root
cd Engineering_Assistant

# Install backend dependencies
pip install -r backend/requirements.txt

# (Optional) Configure environment variables in backend/.env
# Copy example:
cp backend/.env.example backend/.env

# Launch FastAPI backend
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API is now live at `http://127.0.0.1:8000` (Interactive docs at `http://127.0.0.1:8000/docs`).

### 2. Frontend Setup (Next.js)

```bash
# In a new terminal, navigate to frontend
cd frontend

# Install frontend dependencies
npm install

# Start development server
npm run dev -- -p 3000
```
Open `http://localhost:3000` in your browser.

---

## 🔑 Environment Variables (`backend/.env`)

```ini
# Google Gemini API Key (recommended - smart offline reasoning fallback active when blank)
GEMINI_API_KEY=your_gemini_api_key_here

# Anthropic Claude API Key (optional fallback)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# GitHub Token (optional - allows private repos and higher rate limits)
GITHUB_TOKEN=your_github_token_here

# Database URL: SQLite default or PostgreSQL
DATABASE_URL=sqlite:///./engineering_assistant.db

# Vector DB storage path
VECTOR_DB_PATH=./chroma_data

# Mock mode toggle (set to true to simulate LLM responses without API charges)
MOCK_LLM=false
```

---

## 🧭 Core User Flow & Features

1. **Connect a Repository (`/`)**:
   - Paste a GitHub URL (e.g. `https://github.com/developer/ai-sample-service`).
   - Live SSE progress bar streams pipeline stages: `Shallow Clone` → `Tree-Sitter Parse` → `Vector Embeddings` → `Dependency Audit` → `Ready`.
   
2. **Repository Dashboard (`/repo/[id]`)**:
   - Metric cards: total files, tree-sitter parsed symbols, dependencies, and OSV security vulnerabilities.
   - Language breakdown composition bar.
   - Identified architectural entry points (e.g. `src/index.js`).
   - Incremental diff-based re-indexing button.

3. **Interactive Architecture Graph (`/repo/[id]`)**:
   - Interactive React Flow canvas with zoom and pan.
   - Module nodes display inbound/outbound degrees and entry point badges.
   - Clicking any module immediately opens that file in Code Explorer.

4. **Code Explorer (`/repo/[id]/explore`)**:
   - Left pane: File tree with search filter.
   - Center pane: Prism syntax highlighting with line numbers, bug gutter markers, and parsed AST symbols.
   - Right Inspector: On-demand AI **Explanation**, **Bug Scanner**, **Unit Test Generator**, and **Doc Generator**.

5. **Codebase Q&A with Hybrid RAG (`/repo/[id]/qa`)**:
   - Ask complex architectural and debugging questions (e.g. *"Why might authenticateToken fail with 401?"*).
   - Combines vector similarity with exact symbol keyword boost and caller/callee graphs.
   - Clickable `CodeReferenceChip` components (`src/auth/middleware.js:5-21`) jump straight to the source file and line.

6. **Pull Request Review (`/repo/[id]/pr/[number]`)**:
   - Pinned risk assessment badge and high-level summary.
   - Unified diff view with colored additions and deletions.
   - Inline threaded AI review comments linked directly to diff lines.
   - Explicit confirmation modal to post review comments back to GitHub.

7. **Commit History (`/repo/[id]/commits`)**:
   - Compact developer commit cards with SHA badges.
   - Claude 3.5 single-sentence impact summaries.
   - Expandable commit details and change analysis.

8. **Mock / Live Backend Switcher**:
   - Top-right toggle switches between the live FastAPI server and offline client fixtures for design iteration without API consumption.

---

## 🧪 Verification & Automated Testing

You can run the end-to-end backend pipeline verification script at any time:

```bash
python test_backend_pipeline.py
```
This tests DB initialization, repository registration, Tree-Sitter AST chunking, ChromaDB vector indexing, hybrid Q&A retrieval with cited chunks, bug detection, PR review, and architecture graph extraction.
