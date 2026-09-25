'use client';

import { useState } from 'react';
import {
  GitPullRequest,
  ShieldAlert,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

export default function PRDiffViewer({
  prNumber = 1,
  prTitle = 'Pull Request Review',
  summary = '',
  riskLevel = 'medium',
  diff = '',
  comments = [],
  onPostComment,
}) {
  const [commentText, setCommentText] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  // Parse raw diff into lines with additions, deletions, and line numbers
  const diffLines = diff.split('\n');
  let currentOldLine = 0;
  let currentNewLine = 0;

  const parsedDiff = diffLines.map((line, idx) => {
    let type = 'context';
    let lineNum = '';

    if (line.startsWith('@@')) {
      type = 'hunk';
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        currentOldLine = parseInt(match[1], 10);
        currentNewLine = parseInt(match[2], 10);
      }
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      type = 'add';
      lineNum = currentNewLine;
      currentNewLine++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      type = 'delete';
      lineNum = currentOldLine;
      currentOldLine++;
    } else if (!line.startsWith('diff') && !line.startsWith('index') && !line.startsWith('---') && !line.startsWith('+++')) {
      type = 'context';
      lineNum = currentNewLine;
      currentOldLine++;
      currentNewLine++;
    } else {
      type = 'meta';
    }

    return { line, type, lineNum, id: idx };
  });

  // Group review comments by line
  const commentsByLine = {};
  comments.forEach((c) => {
    const l = c.line || 1;
    if (!commentsByLine[l]) commentsByLine[l] = [];
    commentsByLine[l].push(c);
  });

  const handleConfirmPost = async () => {
    if (!commentText && comments.length === 0) return;
    setIsPosting(true);
    const body = commentText || `Antigravity AI Review:\nSummary: ${summary}\nRisk: ${riskLevel}`;
    if (onPostComment) {
      await onPostComment(body);
    }
    setIsPosting(false);
    setShowConfirm(false);
    setPostSuccess(true);
    setTimeout(() => setPostSuccess(false), 4000);
  };

  const getRiskBadge = (r) => {
    const risk = (r || 'medium').toLowerCase();
    if (risk === 'critical' || risk === 'high') {
      return (
        <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase bg-rose-950/80 text-rose-300 border border-rose-800">
          Risk: {r}
        </span>
      );
    }
    if (risk === 'medium') {
      return (
        <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase bg-amber-950/80 text-amber-300 border border-amber-800">
          Risk: {r}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-800">
        Risk: {r}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 font-mono text-xs overflow-hidden">
      {/* Pinned Summary & Risk Assessment Card */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-100 text-sm">{prTitle}</span>
            <span className="text-slate-500 text-xs">#{prNumber}</span>
          </div>

          <div className="flex items-center gap-3">
            {getRiskBadge(riskLevel)}
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm"
            >
              <Send className="w-3 h-3" />
              <span>Post Review to GitHub</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/60 p-3 rounded border border-slate-800">
          {summary || 'Reviewing diff and checking cross-module impact...'}
        </p>

        {postSuccess && (
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>AI Review comments posted to GitHub PR #{prNumber} successfully.</span>
          </div>
        )}
      </div>

      {/* Diff View with Inline Threaded AI Comments */}
      <div className="flex-1 overflow-auto divide-y divide-slate-800/40">
        {parsedDiff.map((item) => {
          const matchingComments = item.lineNum ? commentsByLine[item.lineNum] : null;

          return (
            <div key={item.id} className="group">
              <div
                className={`flex items-stretch font-mono text-xs select-text ${
                  item.type === 'hunk'
                    ? 'bg-slate-900/90 text-cyan-400 font-semibold py-1 px-3 border-y border-slate-800'
                    : item.type === 'add'
                    ? 'bg-emerald-950/25 text-emerald-300 hover:bg-emerald-950/40'
                    : item.type === 'delete'
                    ? 'bg-rose-950/25 text-rose-300 hover:bg-rose-950/40'
                    : item.type === 'meta'
                    ? 'bg-slate-950 text-slate-500 font-semibold'
                    : 'text-slate-300 hover:bg-slate-900/30'
                }`}
              >
                {/* Line number gutter */}
                <div className="w-12 py-0.5 px-2 text-right text-slate-600 select-none border-r border-slate-800/60 shrink-0">
                  {item.lineNum || ''}
                </div>

                {/* Diff Line Content */}
                <div className="flex-1 py-0.5 px-3 overflow-x-auto whitespace-pre">
                  {item.line}
                </div>
              </div>

              {/* Threaded AI Comments for this line */}
              {matchingComments && matchingComments.length > 0 && (
                <div className="my-2 ml-14 mr-4 p-3 rounded-lg bg-indigo-950/40 border border-indigo-700/60 shadow-md">
                  {matchingComments.map((c, cIdx) => (
                    <div key={cIdx} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 font-sans">
                          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                          AI Review Comment (Line {item.lineNum})
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-indigo-900 text-indigo-300 border border-indigo-700">
                          {c.severity || 'Notice'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 font-sans leading-relaxed">
                        <strong className="text-amber-300 font-mono">{c.issue}: </strong>
                        {c.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal to avoid unintended automatic GitHub posts */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-semibold text-slate-100 text-sm">
                Confirm Post to GitHub PR #{prNumber}
              </h3>
            </div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              This will post the AI review summary and threaded comments directly to the GitHub Pull Request.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isPosting}
                onClick={handleConfirmPost}
                className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
              >
                {isPosting ? 'Posting...' : 'Confirm & Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
