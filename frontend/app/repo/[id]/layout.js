'use client';

import { use, useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';

export default function RepoLayout({ children, params }) {
  const unwrappedParams = use(params);
  const repoId = unwrappedParams.id;
  const [repo, setRepo] = useState(null);

  useEffect(() => {
    if (repoId) {
      api.getRepo(repoId).then((r) => setRepo(r));
    }
  }, [repoId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar repoId={repoId} repoName={repo?.name} />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
