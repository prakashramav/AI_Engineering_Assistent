'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Code2,
  GitBranch,
  Terminal,
  MessageSquare,
  GitPullRequest,
  History,
  ShieldAlert,
  Boxes,
  Activity,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api';

export default function Navbar({ repoId, repoName }) {
  const pathname = usePathname();
  const [isMock, setIsMock] = useState(false);
  const [repos, setRepos] = useState([]);

  useEffect(() => {
    setIsMock(api.isMockMode());
    api.listRepos().then((data) => setRepos(data || []));
  }, []);

  const toggleMock = () => {
    const next = !isMock;
    setIsMock(next);
    api.setMockMode(next);
    window.location.reload();
  };

  const navLinks = repoId
    ? [
        { href: `/repo/${repoId}`, label: 'Overview', icon: Layers },
        { href: `/repo/${repoId}/explore`, label: 'Code Explorer', icon: Code2 },
        { href: `/repo/${repoId}/qa`, label: 'Codebase Q&A', icon: MessageSquare },
        { href: `/repo/${repoId}/pr/1`, label: 'PR Review', icon: GitPullRequest },
        { href: `/repo/${repoId}/commits`, label: 'Commits', icon: History },
      ]
    : [];

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-4">
      {/* Brand & Repo context */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-slate-100 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <span className="tracking-tight text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
            Antigravity <span className="text-cyan-400 font-mono text-xs px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 ml-1">AI-SWE</span>
          </span>
        </Link>

        {repoId && (
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800">
            <GitBranch className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-mono font-medium text-slate-200 bg-slate-900 px-2 py-1 rounded border border-slate-800">
              {repoName || `Repo #${repoId}`}
            </span>
          </div>
        )}
      </div>

      {/* Primary Navigation Tabs */}
      {repoId && (
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== `/repo/${repoId}` && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700/80 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Right controls: Switcher & Mock Mode */}
      <div className="flex items-center gap-3">
        {/* Mock / Live Toggle */}
        <button
          onClick={toggleMock}
          title="Toggle between Live Backend and Offline Mock Fixture Mode"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all ${
            isMock
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isMock ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          {isMock ? 'Mock Fixtures' : 'Live Backend'}
        </button>

        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-md transition-colors"
        >
          Switch Repo
        </Link>
      </div>
    </header>
  );
}
