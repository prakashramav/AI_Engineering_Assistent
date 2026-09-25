'use client';

import { use, useEffect, useState } from 'react';
import {
  History,
  GitCommit,
  User,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';

export default function CommitsPage({ params }) {
  const unwrappedParams = use(params);
  const repoId = unwrappedParams.id;

  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSha, setExpandedSha] = useState(null);

  useEffect(() => {
    if (!repoId) return;

    api.getCommits(repoId).then((data) => {
      setCommits(data || []);
      setLoading(false);
    });
  }, [repoId]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl w-full mx-auto space-y-5 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h1 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Commit History & AI Summaries ({commits.length})
          </h1>
        </div>
        <span className="text-[11px] text-slate-500">
          Summarized with Gemini
        </span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading commits...</div>
      ) : commits.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-lg border border-slate-800">
          No commits recorded for this repository yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-slate-950 overflow-hidden shadow-lg">
          {commits.map((commit, idx) => {
            const isExp = expandedSha === commit.sha;

            return (
              <div
                key={commit.sha || idx}
                className="p-4 hover:bg-slate-900/40 transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => setExpandedSha(isExp ? null : commit.sha)}
                      className="mt-0.5 text-slate-500 hover:text-slate-300"
                    >
                      {isExp ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-bold text-[11px]">
                          {commit.sha}
                        </span>
                        <h3 className="font-semibold text-slate-100 text-xs truncate">
                          {commit.message}
                        </h3>
                      </div>

                      {/* AI One-line Summary */}
                      <div className="flex items-center gap-1.5 text-xs font-sans text-indigo-300 bg-indigo-950/30 border border-indigo-900/40 px-2.5 py-1 rounded">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{commit.ai_summary || commit.message}</span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata: Author & Date */}
                  <div className="text-right text-[11px] text-slate-500 shrink-0 space-y-0.5">
                    <div className="flex items-center justify-end gap-1">
                      <User className="w-3 h-3 text-slate-600" />
                      <span className="text-slate-400">{commit.author || 'Author'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-slate-600">
                      <Calendar className="w-3 h-3" />
                      <span>{commit.date ? commit.date.split('T')[0] : 'recent'}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExp && (
                  <div className="mt-3 pl-7 pt-3 border-t border-slate-800/60 font-sans text-xs space-y-2">
                    <h4 className="font-mono text-[11px] font-bold text-slate-300 uppercase">
                      Commit Analysis & Architectural Changes
                    </h4>
                    <p className="text-slate-400 leading-relaxed bg-slate-900/60 p-3 rounded border border-slate-800 font-mono text-[11px]">
                      {commit.ai_summary}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
