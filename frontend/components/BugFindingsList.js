'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bug,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Wrench,
  CheckCircle2,
} from 'lucide-react';

function getSeverityBadge(sev) {
  const s = (sev || 'medium').toLowerCase();
  if (s === 'critical') {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-rose-950/70 text-rose-300 border border-rose-800/60">
        Critical
      </span>
    );
  }
  if (s === 'high') {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-amber-950/70 text-amber-300 border border-amber-800/60">
        High
      </span>
    );
  }
  if (s === 'medium') {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-yellow-950/70 text-yellow-300 border border-yellow-800/60">
        Medium
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-slate-800 text-slate-300 border border-slate-700">
      Low
    </span>
  );
}

export default function BugFindingsList({ repoId, findings = [], onJumpToCode }) {
  const router = useRouter();
  const [filter, setFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = findings.filter((f) => {
    if (filter === 'ALL') return true;
    return (f.severity || '').toUpperCase() === filter;
  });

  const handleJump = (finding) => {
    const line = finding.start_line || (finding.line_range ? finding.line_range.split('-')[0] : 1);
    if (onJumpToCode) {
      onJumpToCode(finding.file_path, line);
    } else {
      router.push(`/repo/${repoId}/explore?file=${encodeURIComponent(finding.file_path)}&line=${line}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header and Severity Filters */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Audited Findings ({findings.length})
          </span>
        </div>

        <div className="flex items-center gap-1 font-mono text-[11px]">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === lvl
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Findings List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
            <span>No issues found matching filter. Codebase health is high.</span>
          </div>
        ) : (
          filtered.map((item, idx) => {
            const isExp = expandedId === item.id || (!item.id && expandedId === idx);
            const toggleKey = item.id || idx;

            return (
              <div
                key={toggleKey}
                className="p-3 hover:bg-slate-900/40 transition-colors rounded-md my-1"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <button
                      onClick={() => setExpandedId(isExp ? null : toggleKey)}
                      className="mt-0.5 text-slate-500 hover:text-slate-300"
                    >
                      {isExp ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getSeverityBadge(item.severity)}
                        <span className="text-xs font-semibold text-slate-100 truncate">
                          {item.title}
                        </span>
                        {item.category && (
                          <span className="text-[10px] text-slate-500 font-mono px-1 rounded bg-slate-900 border border-slate-800">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Jump button */}
                  <button
                    onClick={() => handleJump(item)}
                    className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 px-2 py-1 rounded transition-colors shrink-0"
                  >
                    <span>{item.file_path}:{item.line_range}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Expanded suggested fix */}
                {isExp && (
                  <div className="mt-3 pl-6 pr-2 pt-2 border-t border-slate-800/60 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-semibold mb-1">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Recommended Remediation:</span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                      {item.suggested_fix || 'Review function boundaries and add parameter sanitation.'}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
