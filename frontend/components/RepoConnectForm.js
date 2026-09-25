'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Sparkles, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import IndexingProgress from './IndexingProgress';

function GithubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function RepoConnectForm({ onRepoConnected }) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [indexingState, setIndexingState] = useState(null);
  const [error, setError] = useState('');

  const quickSamples = [
    { label: 'Sample Service', url: 'https://github.com/developer/ai-sample-service' },
    { label: 'FastAPI Template', url: 'https://github.com/tiangolo/full-stack-fastapi-template' },
    { label: 'Express RealWorld', url: 'https://github.com/gothinkster/node-express-realworld-example-app' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError('');
    setLoading(true);
    try {
      const res = await api.connectRepo(url.trim(), token.trim());
      setLoading(false);

      if (res && res.id) {
        // Start listening to SSE events
        setIndexingState({
          id: res.id,
          status: 'cloning',
          progress: 15,
          message: 'Initiating cloning and parsing pipeline...',
        });

        const unsubscribe = api.subscribeIndexSSE(
          res.id,
          (event) => {
            setIndexingState((prev) => ({
              ...prev,
              status: event.step,
              progress: event.percent,
              message: event.message,
              totalFiles: event.total_files,
              totalChunks: event.total_chunks,
            }));

            if (event.step === 'ready') {
              setTimeout(() => {
                if (onRepoConnected) onRepoConnected(res);
                router.push(`/repo/${res.id}`);
              }, 1200);
            }
          },
          (err) => {
            console.warn('SSE subscription notice:', err);
            // In case SSE drops or in mock mode, redirect anyway after brief animation
            setTimeout(() => {
              if (onRepoConnected) onRepoConnected(res);
              router.push(`/repo/${res.id}`);
            }, 1500);
          }
        );
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to connect repository.');
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-2xl backdrop-blur-md max-w-2xl mx-auto space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <GithubIcon className="w-5 h-5 text-cyan-400" />
          <span>Connect a GitHub Repository</span>
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The pipeline parses your codebase with Tree-Sitter AST chunking, generates embeddings in Chroma vector store, and extracts architecture graphs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
        {/* Repo URL Input */}
        <div className="space-y-1.5">
          <label className="text-slate-300 font-semibold flex items-center justify-between">
            <span>Repository URL</span>
            <span className="text-slate-500 font-normal text-[11px]">Public or Private</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="https://github.com/owner/repository"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Quick fill samples */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-500">Quick fill:</span>
          {quickSamples.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setUrl(s.url)}
              className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 border border-slate-700/60 text-[10px] transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Token Input (Optional) */}
        <div className="space-y-1.5">
          <label className="text-slate-300 font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Personal Access Token</span>
            </span>
            <span className="text-slate-500 font-normal text-[11px]">(Optional for public repos)</span>
          </label>
          <input
            type="password"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading || indexingState !== null}
          className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-sans font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Registering repository...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Index Repository & Generate Intelligence</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Live Indexing SSE Overlay */}
      {indexingState && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <IndexingProgress
            status={indexingState.status}
            progress={indexingState.progress}
            message={indexingState.message}
            totalFiles={indexingState.totalFiles}
            totalChunks={indexingState.totalChunks}
          />
        </div>
      )}
    </div>
  );
}
