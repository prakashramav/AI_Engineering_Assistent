'use client';

import { useRouter } from 'next/navigation';
import { FileCode, ExternalLink } from 'lucide-react';

export default function CodeReferenceChip({
  repoId,
  filePath,
  lineRange,
  startLine,
  symbol,
  onClick,
}) {
  const router = useRouter();
  const targetLine = startLine || (lineRange ? lineRange.split('-')[0] : 1);
  const displayLabel = `${filePath}${lineRange ? `:${lineRange}` : ''}`;

  const handleClick = (e) => {
    e.preventDefault();
    if (onClick) {
      onClick({ filePath, lineRange, targetLine, symbol });
    } else if (repoId) {
      router.push(`/repo/${repoId}/explore?file=${encodeURIComponent(filePath)}&line=${targetLine}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      title={`Open ${displayLabel} in code viewer`}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 my-0.5 rounded bg-indigo-950/60 hover:bg-indigo-900/80 text-cyan-300 hover:text-cyan-200 border border-indigo-700/50 hover:border-cyan-500/80 text-xs font-mono transition-all group shadow-sm"
    >
      <FileCode className="w-3 h-3 text-cyan-400 group-hover:scale-110 transition-transform" />
      <span className="font-medium underline decoration-cyan-500/40 underline-offset-2">
        {displayLabel}
      </span>
      {symbol && (
        <span className="text-[10px] text-indigo-300 font-sans px-1 rounded bg-indigo-900/80">
          {symbol}
        </span>
      )}
      <ExternalLink className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 transition-opacity ml-0.5" />
    </button>
  );
}
