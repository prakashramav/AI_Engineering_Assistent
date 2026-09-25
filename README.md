# AI Software Engineering Assistant Developer Platform

A full-stack, developer-first engineering intelligence platform that connects to GitHub repositories to provide deep code understanding, Tree-Sitter AST chunking, RAG codebase Q&A, bug detection, automated PR reviews, test/doc generation, dependency security audits, and interactive architecture visualization.

---

## 📌 Problem Statement

Modern software codebases are massive, distributed, and complex. Engineering teams face critical operational bottlenecks:
- **High Onboarding & Comprehension Cost**: Developers spend up to 60–70% of their time reading, tracing, and understanding existing code rather than building new features.
- **Context Limits & Hallucinations in Standard LLMs**: Passing raw code into generic AI prompts leads to truncated context, hallucinated line numbers, and irrelevant recommendations.
- **Architectural Blindspots**: Most tools lack awareness of caller-callee call graphs, module dependencies, and entry-point topologies.
- **Manual, Slow PR Reviews & Bug Auditing**: Security vulnerabilities, race conditions, edge-case regressions, and missing unit tests slip into production due to review fatigue.

---

## 💡 What I Solve

This platform provides an all-in-one, local-first AI engineering cockpit:
- **Grounded Codebase Intelligence**: Ask complex questions about any repository and receive answers with precise, clickable file and line-range citations (`path/to/file.ext:start-end`).
- **Deep Architectural Visibility**: Interactive dependency graph visualization powered by React Flow, mapping modules, inbound/outbound degrees, and system entry points.
- **Automated Bug & Vulnerability Detection**: Identifies critical logic errors, unhandled exceptions, hardcoded secrets, and third-party CVE vulnerabilities via the OSV API.
- **Automated Pull Request Reviews**: Analyzes git diffs against codebase context, provides overall risk scores, and generates inline threaded comments linked to diff lines.
- **Instant Developer Tooling**: Generates production-ready unit tests (PyTest / Vitest) and comprehensive module documentation with a single click.
- **Seamless Local & Cloud Resilience**: Operates with Google Gemini API, with local offline heuristics fallback when running without API keys.

---

## ⚙️ How I Solve It

The platform implements an end-to-end multi-stage pipeline:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            1. INGESTION & PARSING                           │
│  GitHub Repository ──► Shallow Clone ──► Tree-Sitter AST Parser             │
│  (Language-aware extraction: functions, classes, imports in Python/JS/TS)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    2. HYBRID INDEXING & KNOWLEDGE GRAPH                     │
│  - ChromaDB Vector Store: Cosine vector embeddings for semantic search      │
│  - NetworkX Graph Engine: Module dependency and call-graph topology         │
│  - SQLite Database: File records, AST chunk metadata, and security findings │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    3. HYBRID RAG & MULTI-LLM REASONING                      │
│  User Query ──► Hybrid Retrieval (Vector Similarity + Exact Symbol Match)   │
│             ──► Graph Context Expansion (Callers / Callees)                 │
│             ──► Google Gemini API (gemini-2.5-flash)                        │
│             ──► Grounded Response with Source Line Citations                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                         4. INTERACTIVE DEVELOPER UI                         │
│  Next.js 16 App Router • React Flow Visual Graph • Prism Syntax Inspector   │
│  Real-time SSE Progress Streaming • Side-by-Side PR Diff Viewer             │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Semantic AST Chunking with Tree-Sitter**:
   Instead of naive line or token chunking, the backend uses Tree-Sitter grammars (Python, JavaScript, TypeScript, JSON) to split code along natural syntactic boundaries (functions, classes, methods), retaining symbol names, signatures, and exact line ranges.

2. **Hybrid RAG Retrieval Engine**:
   When answering questions, the system combines cosine vector similarity in ChromaDB with keyword-boosted exact symbol matching and caller/callee traversal. This eliminates hallucinations and guarantees high-precision code retrieval.

3. **Modern LLM Integration (Google Gemini)**:
   Powered by the official `google-genai` SDK with `gemini-2.5-flash` for high-throughput, low-latency reasoning and codebase intelligence, with a deterministic local reasoning engine for zero-cost offline development.

4. **Security & Dependency Auditing**:
   Scans `package.json` and `requirements.txt` against Google's Open Source Vulnerabilities (OSV) database to catch known CVEs while running static AST regex checks for leaked credentials and silent error catching.

5. **Full-Stack Developer Platform**:
   - **Frontend**: Next.js 16, Tailwind CSS, Prism.js, `@xyflow/react` (React Flow topology), `lucide-react`.
   - **Backend**: FastAPI (Python 3.10+), SQLAlchemy, ChromaDB, NetworkX, and SSE real-time streaming.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: Next.js 16 (App Router), JavaScript, Tailwind CSS, Prism.js, `@xyflow/react` (React Flow), `lucide-react`.
- **Backend**: FastAPI (Python), async endpoints, background indexing tasks, SSE progress streams.
- **Code Parsing**: Tree-sitter AST parsing (`tree-sitter`, `tree-sitter-python`, `tree-sitter-javascript`, `tree-sitter-typescript`) for language-aware function, class, and import boundary extraction.
- **Vector Store**: ChromaDB with `BaseVectorStore` interface (cleanly swappable to Pinecone/Weaviate with one file change).
- **LLM Reasoning**: Google Gemini (via `google-genai` SDK with `gemini-2.5-flash`) for Q&A, bug detection, PR review, test generation, and doc generation.
- **Database**: SQLAlchemy models for repositories, files, tree-sitter chunks, dependency graph edges, dependencies, bug findings, Q&A history, PR reviews, and commit summaries.

---

## 🚀 Quickstart & Local Setup

### 1. Backend Setup (FastAPI)

```bash
# Navigate to project root
cd Engineering_Assistant

# Install backend dependencies
pip install -r backend/requirements.txt

# Configure environment variables in backend/.env
# Copy example:
cp backend/.env.example backend/.env

# Launch FastAPI backend
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API will be live at `http://127.0.0.1:8000` (Interactive Swagger docs at `http://127.0.0.1:8000/docs`).

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
# Google Gemini API Key (smart offline reasoning fallback active when blank)
GEMINI_API_KEY=your_gemini_api_key_here

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
   - AI single-sentence impact summaries.
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
