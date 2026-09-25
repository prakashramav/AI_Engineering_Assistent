'use client';

import { Activity, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function IndexingProgress({
  status = 'pending',
  progress = 0,
  message = '',
  totalFiles = 0,
  totalChunks = 0,
}) {
  const steps = [
    { key: 'cloning', label: '1. Shallow Clone' },
    { key: 'parsing', label: '2. Tree-Sitter Parse' },
    { key: 'embedding', label: '3. Vector Embeddings' },
    { key: 'analyzing', label: '4. Dependency Audit' },
    { key: 'ready', label: '5. Ready' },
  ];

  const getStepStatus = (stepKey) => {
    const order = ['pending', 'cloning', 'parsing', 'embedding', 'analyzing', 'finalizing', 'ready'];
    const currIdx = order.indexOf(status);
    const stepIdx = order.indexOf(stepKey);
    if (currIdx > stepIdx || status === 'ready') return 'complete';
    if (currIdx === stepIdx) return 'current';
    return 'upcoming';
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 font-mono text-xs shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === 'ready' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : status === 'failed' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          )}
          <span className="font-semibold text-slate-100 uppercase tracking-wide">
            Indexing Status: {status}
          </span>
        </div>
        <span className="text-cyan-400 font-bold">{Math.round(progress)}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-5 gap-1 pt-1 text-[10px]">
        {steps.map((st) => {
          const stStatus = getStepStatus(st.key);
          return (
            <div
              key={st.key}
              className={`p-1.5 rounded text-center truncate border ${
                stStatus === 'complete'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                  : stStatus === 'current'
                  ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700 animate-pulse'
                  : 'bg-slate-950/60 text-slate-600 border-slate-900'
              }`}
            >
              {st.label}
            </div>
          );
        })}
      </div>

      {/* Detail Message & Stats */}
      <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
        <span className="truncate">{message || 'Processing code structures...'}</span>
        {totalFiles > 0 && (
          <span className="shrink-0 text-slate-500">
            {totalFiles} files • {totalChunks} symbols
          </span>
        )}
      </div>
    </div>
  );
}
