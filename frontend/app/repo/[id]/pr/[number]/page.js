'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GitPullRequest,
  Loader2,
  RefreshCw,
  Sparkles,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import PRDiffViewer from '@/components/PRDiffViewer';

export default function PRReviewPage({ params }) {
  const unwrappedParams = use(params);
  const repoId = unwrappedParams.id;
  const prNumber = unwrappedParams.number || '1';
  const router = useRouter();

  const [prList, setPrList] = useState([]);
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customPrInput, setCustomPrInput] = useState('');

  useEffect(() => {
    if (!repoId) return;

    // Load available PRs
    api.getPullRequests(repoId).then((prs) => setPrList(prs || []));

    // Load review for this PR
    setLoading(true);
    api.reviewPullRequest(repoId, prNumber)
      .then((data) => {
        setReviewData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [repoId, prNumber]);

  const handleSelectPR = (num) => {
    router.push(`/repo/${repoId}/pr/${num}`);
  };

  const handleCustomPRSubmit = (e) => {
    e.preventDefault();
    if (customPrInput.trim()) {
      router.push(`/repo/${repoId}/pr/${customPrInput.trim()}`);
    }
  };

  const handlePostComment = async (commentText) => {
    return await api.postPRComment(repoId, prNumber, commentText);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Sidebar: Available PRs (240px) */}
      <div className="w-60 shrink-0 h-full border-r border-slate-800 bg-slate-950 flex flex-col font-mono text-xs">
        <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <GitPullRequest className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pull Requests</span>
          </div>
        </div>

        {/* PR input jump */}
        <form onSubmit={handleCustomPRSubmit} className="p-2 border-b border-slate-800">
          <input
            type="text"
            placeholder="Jump to PR #..."
            value={customPrInput}
            onChange={(e) => setCustomPrInput(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          />
        </form>

        {/* PR List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-1">
          {prList.map((pr) => {
            const isSelected = String(pr.number) === String(prNumber);
            return (
              <button
                key={pr.number}
                onClick={() => handleSelectPR(pr.number)}
                className={`w-full p-2.5 rounded text-left transition-colors space-y-1 block ${
                  isSelected
                    ? 'bg-indigo-950/70 text-cyan-300 border-l-2 border-cyan-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold">PR #{pr.number}</span>
                  <span className="text-[10px] px-1 rounded bg-slate-900 text-emerald-400 border border-slate-800">
                    {pr.state || 'open'}
                  </span>
                </div>
                <div className="text-xs truncate font-sans text-slate-300">
                  {pr.title}
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  by {pr.author}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Diff & Review Pane */}
      <div className="flex-1 h-full min-w-0 flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span>Fetching diff from GitHub & generating AI review...</span>
          </div>
        ) : (
          <PRDiffViewer
            prNumber={prNumber}
            prTitle={reviewData?.pr_title || `PR #${prNumber}`}
            summary={reviewData?.summary}
            riskLevel={reviewData?.risk_level}
            diff={reviewData?.diff || ''}
            comments={reviewData?.comments || []}
            onPostComment={handlePostComment}
          />
        )}
      </div>
    </div>
  );
}
