'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  FileCode,
  Cpu,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  GitBranch,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Bug,
  GitPullRequest,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import ArchitectureGraph from '@/components/ArchitectureGraph';
import DependencyTable from '@/components/DependencyTable';
import BugFindingsList from '@/components/BugFindingsList';

export default function RepoDashboard({ params }) {
  const unwrappedParams = use(params);
  const repoId = unwrappedParams.id;

  const [overview, setOverview] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [dependencies, setDependencies] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [activeTab, setActiveTab] = useState('graph'); // 'graph' | 'dependencies' | 'bugs'
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncMsg, setResyncMsg] = useState('');

  useEffect(() => {
    if (!repoId) return;

    api.getRepoOverview(repoId).then((d) => setOverview(d));
    api.getArchitectureGraph(repoId).then((g) => setGraphData(g));
    api.getDependencies(repoId).then((deps) => setDependencies(deps || []));
    api.getBugs(repoId).then((b) => setBugs(b || []));
  }, [repoId]);

  const handleResync = async () => {
    setIsResyncing(true);
    setResyncMsg('Checking for new commits & diff-based re-indexing...');
    try {
      await api.resyncRepo(repoId);
      setTimeout(async () => {
        const fresh = await api.getRepoOverview(repoId);
        setOverview(fresh);
        setIsResyncing(false);
        setResyncMsg('Re-indexed successfully!');
        setTimeout(() => setResyncMsg(''), 3000);
      }, 1500);
    } catch (err) {
      setIsResyncing(false);
      setResyncMsg('Resync failed: ' + err.message);
    }
  };

  const languages = overview?.languages || { JavaScript: 65, Python: 25, JSON: 10 };
  const totalLangVal = Object.values(languages).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-7xl w-full mx-auto">
      {/* Top Header Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg backdrop-blur-sm flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 font-mono">
              {overview?.name || `Repository #${repoId}`}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              {overview?.owner || 'developer'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-mono">
              {overview?.status || 'ready'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5 text-slate-500" />
              main
            </span>
            <span>SHA: {overview?.last_indexed_sha || 'head'}</span>
          </div>
        </div>

        {/* Quick Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResync}
            disabled={isResyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResyncing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isResyncing ? 'Syncing...' : 'Incremental Re-sync'}</span>
          </button>

          <Link
            href={`/repo/${repoId}/qa`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ask Q&A</span>
          </Link>
        </div>
      </div>

      {resyncMsg && (
        <div className="p-2.5 rounded bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 text-xs font-mono">
          {resyncMsg}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
          <div className="text-slate-500 text-xs font-mono uppercase tracking-wider">Total Files</div>
          <div className="text-2xl font-bold font-mono text-slate-100">{overview?.total_files || 4}</div>
          <div className="text-[11px] text-slate-400">All non-ignored source files</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
          <div className="text-slate-500 text-xs font-mono uppercase tracking-wider">Tree-Sitter Chunks</div>
          <div className="text-2xl font-bold font-mono text-cyan-400">{overview?.total_chunks || 8}</div>
          <div className="text-[11px] text-slate-400">Functions, classes & modules</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
          <div className="text-slate-500 text-xs font-mono uppercase tracking-wider">Dependencies</div>
          <div className="text-2xl font-bold font-mono text-indigo-400">{dependencies.length || 4}</div>
          <div className="text-[11px] text-slate-400">package.json / requirements</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
          <div className="text-slate-500 text-xs font-mono uppercase tracking-wider">Vulnerabilities</div>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {overview?.vulnerable_dependencies ?? 2}
          </div>
          <div className="text-[11px] text-slate-400">OSV database security flags</div>
        </div>
      </div>

      {/* Architecture & Entry Points Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Architecture Overview */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono">
              Architecture & System Overview
            </h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {overview?.architecture_summary || 'Evaluating codebase control flow and entry points...'}
          </p>

          {/* Languages Breakdown Bar */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Language Composition</span>
              <div className="flex items-center gap-3">
                {Object.entries(languages).map(([lang, val]) => (
                  <span key={lang} className="flex items-center gap-1 text-[11px]">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        lang.toLowerCase().includes('java') ? 'bg-cyan-400' : 'bg-indigo-400'
                      }`}
                    />
                    {lang} ({Math.round((val / totalLangVal) * 100)}%)
                  </span>
                ))}
              </div>
            </div>
            <div className="h-2 rounded-full bg-slate-800 flex overflow-hidden">
              <div className="bg-cyan-400 h-full" style={{ width: '65%' }} />
              <div className="bg-indigo-400 h-full" style={{ width: '25%' }} />
              <div className="bg-amber-400 h-full" style={{ width: '10%' }} />
            </div>
          </div>
        </div>

        {/* Identified Entry Points */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono">
              Entry Points
            </h2>
            <span className="text-[10px] text-cyan-400 font-mono">Inbound Roots</span>
          </div>

          <div className="space-y-2">
            {(overview?.entry_points || ['src/index.js', 'src/auth/middleware.js']).map((ep) => (
              <Link
                key={ep}
                href={`/repo/${repoId}/explore?file=${encodeURIComponent(ep)}`}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-xs font-mono text-slate-300 hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{ep}</span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs for Architecture Graph / Dependencies / Bugs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              activeTab === 'graph'
                ? 'bg-indigo-950/80 text-cyan-300 border border-indigo-700/60 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Interactive Architecture Graph</span>
          </button>

          <button
            onClick={() => setActiveTab('dependencies')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              activeTab === 'dependencies'
                ? 'bg-indigo-950/80 text-cyan-300 border border-indigo-700/60 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Dependencies & Vulnerabilities ({dependencies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bugs')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              activeTab === 'bugs'
                ? 'bg-indigo-950/80 text-cyan-300 border border-indigo-700/60 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Audited Bug Findings ({bugs.length})</span>
          </button>
        </div>

        {/* Tab Viewport */}
        <div className="h-[480px]">
          {activeTab === 'graph' && (
            <ArchitectureGraph repoId={repoId} graphData={graphData} />
          )}
          {activeTab === 'dependencies' && (
            <DependencyTable dependencies={dependencies} />
          )}
          {activeTab === 'bugs' && (
            <BugFindingsList repoId={repoId} findings={bugs} />
          )}
        </div>
      </div>
    </div>
  );
}
