'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Terminal,
  GitBranch,
  Boxes,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import RepoConnectForm from '@/components/RepoConnectForm';
import { api } from '@/lib/api';

export default function HomePage() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listRepos().then((data) => {
      setRepos(data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Tree-Sitter Semantic Chunking • Hybrid Vector RAG • Claude 3.5</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-100">
            AI Software Engineering{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500">
              Platform
            </span>
          </h1>

          <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Deep codebase understanding, language-aware structural chunking,
            architecture visualization, automated PR reviews, and precision RAG Q&A with exact line citations.
          </p>
        </div>

        {/* Connect Form */}
        <RepoConnectForm />

        {/* Recent Repositories Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono">
                Indexed Repositories ({repos.length})
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              Loading repositories...
            </div>
          ) : repos.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono bg-slate-900/40 rounded-lg border border-slate-800">
              No repositories indexed yet. Connect a GitHub repository above to begin.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repos.map((repo) => (
                <Link
                  key={repo.id}
                  href={`/repo/${repo.id}`}
                  className="group p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all shadow-md space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {repo.owner}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {repo.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-400 transition-colors truncate">
                      {repo.name}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {repo.architecture_summary || 'Indexed codebase with semantic chunking and architecture graph.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-500">
                    <span>{repo.total_files || 4} files • {repo.total_chunks || 8} symbols</span>
                    <span className="text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Open <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 text-xs">
          <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800/60 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold font-mono">
              <Cpu className="w-4 h-4" />
              <span>Tree-Sitter Chunking</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Splits by functions, classes, and imports with exact byte and line ranges rather than naive text slicing.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800/60 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold font-mono">
              <Layers className="w-4 h-4" />
              <span>Architecture Visualization</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Interactive React Flow module graphs showing imports, circular dependencies, and service entry points.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800/60 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold font-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>Audit & PR Review</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Automated bug detection, vulnerability checking via OSV, and threaded inline AI comments for pull requests.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
