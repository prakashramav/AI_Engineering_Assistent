from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Boolean,
    ForeignKey,
    JSON,
    Float,
)
from sqlalchemy.orm import relationship
from .session import Base

class Repo(Base):
    __tablename__ = "repos"

    id = Column(Integer, primary_key=True, index=True)
    github_url = Column(String(512), unique=True, index=True, nullable=False)
    owner = Column(String(128), index=True)
    name = Column(String(128), index=True)
    default_branch = Column(String(64), default="main")
    last_indexed_sha = Column(String(64), nullable=True)
    status = Column(String(32), default="pending")  # pending, cloning, parsing, embedding, ready, failed
    status_message = Column(Text, nullable=True)
    indexing_progress = Column(Float, default=0.0)  # 0 to 100
    languages = Column(JSON, default=dict)  # {"Python": 65, "TypeScript": 35}
    architecture_summary = Column(Text, nullable=True)
    entry_points = Column(JSON, default=list)  # ["main.py", "app.js"]
    total_files = Column(Integer, default=0)
    total_chunks = Column(Integer, default=0)
    local_path = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    files = relationship("FileRecord", back_populates="repo", cascade="all, delete-orphan")
    chunks = relationship("CodeChunk", back_populates="repo", cascade="all, delete-orphan")
    graph_edges = relationship("DependencyGraphEdge", back_populates="repo", cascade="all, delete-orphan")
    dependencies = relationship("Dependency", back_populates="repo", cascade="all, delete-orphan")
    bug_findings = relationship("BugFinding", back_populates="repo", cascade="all, delete-orphan")
    qa_histories = relationship("QAHistory", back_populates="repo", cascade="all, delete-orphan")
    pr_reviews = relationship("PRReview", back_populates="repo", cascade="all, delete-orphan")
    commits = relationship("CommitSummary", back_populates="repo", cascade="all, delete-orphan")


class FileRecord(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repos.id", ondelete="CASCADE"), nullable=False, index=True)
    path = Column(String(512), nullable=False, index=True)
    language = Column(String(64), default="text")
    size_bytes = Column(Integer, default=0)
    last_modified_sha = Column(String(64), nullable=True)
    content_hash = Column(String(64), nullable=True)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    repo = relationship("Repo", back_populates="files")
    chunks = relationship("CodeChunk", back_populates="file", cascade="all, delete-orphan")


class CodeChunk(Base):
    __tablename__ = "code_chunks"

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repos.id", ondelete="CASCADE"), nullable=False, index=True)
    file_id = Column(Integer, ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(512), nullable=False)
    symbol_name = Column(String(256), nullable=True, index=True)
    symbol_type = Column(String(64), default="function")  # function, class, method, module, import_block
    start_line = Column(Integer, nullable=False)
    end_line = Column(Integer, nullable=False)
    start_byte = Column(Integer, default=0)
    end_byte = Column(Integer, default=0)
    content = Column(Text, nullable=False)
    surrounding_context = Column(Text, nullable=True)
    embedding_ref = Column(String(128), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    repo = relationship("Repo", back_populates="chunks")
    file = relationship("FileRecord", back_populates="chunks")


class DependencyGraphEdge(Base):
    __tablename__ = "dependency_graph_edges"

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repos.id", ondelete="CASCADE"), nullable=False, index=True)
    from_module = Column(String(512), nullable=False, index=True)
    to_module = Column(String(512), nullable=False, index=True)
    edge_type = Column(String(32), default="import")  # import, call, extends
    import_statement = Column(String(512), nullable=True)

    repo = relationship("Repo", back_populates="graph_edges")


class Dependency(Base):
    __tablename__ = "dependencies"

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repos.id", ondelete="CASCADE"), nullable=False, index=True)
    package_name = Column(String(256), nullable=False, index=True)
    current_version = Column(String(64), nullable=True)
    latest_version = Column(String(64), nullable=True)
    vulnerability_flag = Column(Boolean, default=False)
    severity = Column(String(32), default="none")  # none, low, medium, high, critical
    advisory_summary = Column(Text, nullable=True)
    ecosystem = Column(String(32), default="npm")  # npm, pypi, cargo, go
    manifest_path = Column(String(256), default="package.json")

    repo = relationship("Repo", back_populates="dependencies")


class BugFinding(Base):
    __tablename__ = "bug_findings"

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repos.id", ondelete="CASCADE"), nullable=False, index=True)
    file_id = Column(Integer, ForeignKey("files.id", ondelete="SET NULL"), nullable=True)
    file_path = Column(String(512), nullable=False, index=True)
    line_range = Column(String(64), nullable=False)  # "42-58" or "10"
    start_line = Column(Integer, default=1)
    end_line = Column(Integer, default=1)
    severity = Column(String(32), default="medium")  # critical, high, medium, low
    category = Column(String(64), default="logic")   # security, logic, performance, concurrency, style
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=False)
    suggested_fix = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    repo = relationship("Repo", back_populates="bug_findings")


class QAHistory(Base):
    __tablename__ = "qa_history"

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repos.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    cited_chunks = Column(JSON, default=list)  # [{"file_path": "...", "line_range": "10-25", "symbol": "..."}]
    created_at = Column(DateTime, default=datetime.utcnow)

    repo = relationship("Repo", back_populates="qa_histories")


class PRReview(Base):
    __tablename__ = "pr_reviews"

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repos.id", ondelete="CASCADE"), nullable=False, index=True)
    pr_number = Column(Integer, nullable=False, index=True)
    pr_title = Column(String(256), nullable=True)
    pr_author = Column(String(128), nullable=True)
    summary = Column(Text, nullable=False)
    risk_level = Column(String(32), default="low")  # low, medium, high, critical
    diff_summary = Column(Text, nullable=True)
    comments = Column(JSON, default=list)  # [{"file": "...", "line": 42, "issue": "...", "severity": "...", "suggestion": "..."}]
    created_at = Column(DateTime, default=datetime.utcnow)

    repo = relationship("Repo", back_populates="pr_reviews")


class CommitSummary(Base):
    __tablename__ = "commit_summaries"

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repos.id", ondelete="CASCADE"), nullable=False, index=True)
    commit_sha = Column(String(64), nullable=False, index=True)
    message = Column(Text, nullable=False)
    author = Column(String(128), nullable=True)
    date = Column(String(64), nullable=True)
    ai_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    repo = relationship("Repo", back_populates="commits")
