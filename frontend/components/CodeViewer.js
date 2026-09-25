'use client';

import { useEffect, useRef, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import { AlertCircle, Bug, Sparkles, BookOpen, FileCheck } from 'lucide-react';

export default function CodeViewer({
  code = '',
  language = 'javascript',
  filePath = '',
  targetLine = null,
  bugs = [],
  chunks = [],
  onSelectSymbol,
  onExplainSelection,
}) {
  const codeRef = useRef(null);
  const [selectedLines, setSelectedLines] = useState(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  // Scroll to target line if provided
  useEffect(() => {
    if (targetLine) {
      const lineElem = document.getElementById(`line-${targetLine}`);
      if (lineElem) {
        lineElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [targetLine]);

  const lines = code ? code.split('\n') : [];

  // Group bugs by line
  const bugsByLine = {};
  bugs.forEach((b) => {
    const lineNum = b.start_line || parseInt(b.line_range?.split('-')[0]) || 1;
    if (!bugsByLine[lineNum]) bugsByLine[lineNum] = [];
    bugsByLine[lineNum].push(b);
  });

  return (
    <div className="h-full flex flex-col bg-slate-950 font-mono text-xs overflow-hidden">
      {/* File Header Bar */}
      <div className="h-10 px-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="text-slate-400">File:</span>
          <span className="text-slate-100 font-semibold truncate">{filePath || 'Select a file'}</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {bugs.length > 0 && (
            <span className="flex items-center gap-1 text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded text-[11px]">
              <Bug className="w-3 h-3" />
              {bugs.length} {bugs.length === 1 ? 'issue' : 'issues'} flagged
            </span>
          )}
          <span className="text-slate-500 text-[11px]">{lines.length} lines</span>
        </div>
      </div>

      {/* Code Area with Line Numbers & Bug Gutters */}
      <div className="flex-1 overflow-auto flex relative select-text">
        {/* Line Numbers & Gutter Annotations */}
        <div className="sticky left-0 bg-slate-950/95 border-r border-slate-800/80 py-3 px-2 flex flex-col items-end text-slate-600 select-none z-10 shrink-0 min-w-[54px]">
          {lines.map((_, i) => {
            const lineNum = i + 1;
            const hasBug = bugsByLine[lineNum];
            const isTarget = targetLine && Number(targetLine) === lineNum;

            return (
              <div
                key={lineNum}
                id={`gutter-${lineNum}`}
                className={`h-5 leading-5 flex items-center gap-1.5 text-[11px] pr-1 ${
                  isTarget ? 'text-cyan-400 font-bold' : ''
                }`}
              >
                {hasBug ? (
                  <span
                    title={hasBug[0].title}
                    className={`w-3.5 h-3.5 flex items-center justify-center rounded-full text-[9px] ${
                      hasBug[0].severity === 'critical'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : hasBug[0].severity === 'high'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-yellow-950 text-yellow-400 border border-yellow-800'
                    }`}
                  >
                    !
                  </span>
                ) : (
                  <span className="w-3.5" />
                )}
                <span>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Code Lines with Syntax Highlighting */}
        <div className="flex-1 py-3 px-4 overflow-x-auto min-w-0">
          <pre className="!m-0 !p-0 !bg-transparent">
            <code
              ref={codeRef}
              className={`language-${language} block`}
              style={{ background: 'transparent' }}
            >
              {lines.map((line, i) => {
                const lineNum = i + 1;
                const isTarget = targetLine && Number(targetLine) === lineNum;
                const bug = bugsByLine[lineNum]?.[0];

                return (
                  <div
                    key={lineNum}
                    id={`line-${lineNum}`}
                    className={`h-5 leading-5 flex items-center ${
                      isTarget ? 'bg-cyan-950/40 border-l-2 border-cyan-400 pl-1' : ''
                    } ${bug ? 'bg-amber-950/20' : ''}`}
                  >
                    <span>{line || ' '}</span>
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      </div>

      {/* Symbol Chunks Bar (Tree-Sitter parsed structure) */}
      {chunks && chunks.length > 0 && (
        <div className="h-8 border-t border-slate-800/80 bg-slate-900/40 px-3 flex items-center gap-2 overflow-x-auto shrink-0 text-[11px]">
          <span className="text-slate-500 uppercase tracking-wider text-[10px]">Symbols:</span>
          {chunks.map((c, idx) => (
            <button
              key={idx}
              onClick={() => onSelectSymbol && onSelectSymbol(c)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors truncate shrink-0 flex items-center gap-1"
            >
              <span className="text-cyan-400 text-[10px]">[{c.symbol_type}]</span>
              <span>{c.symbol_name}</span>
              <span className="text-slate-500 text-[10px]">:{c.start_line}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
