'use client';

import { useState } from 'react';
import { ShieldAlert, ShieldCheck, Search, ArrowUpDown } from 'lucide-react';

export default function DependencyTable({ dependencies = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyVulnerable, setOnlyVulnerable] = useState(false);
  const [sortBy, setSortBy] = useState('vulnerability');

  const filtered = dependencies.filter((dep) => {
    if (onlyVulnerable && !dep.vulnerability_flag) return false;
    if (searchTerm && !dep.package_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'vulnerability') {
      return (b.vulnerability_flag ? 1 : 0) - (a.vulnerability_flag ? 1 : 0);
    }
    if (sortBy === 'name') {
      return a.package_name.localeCompare(b.package_name);
    }
    return 0;
  });

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-full">
      {/* Table Toolbar */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search dependencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 text-xs font-mono text-slate-200 pl-8 pr-3 py-1.5 rounded border border-slate-800 focus:outline-none focus:border-cyan-500 w-48"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyVulnerable}
              onChange={(e) => setOnlyVulnerable(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-0"
            />
            <span>Vulnerable only</span>
          </label>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>Sort:</span>
          <button
            onClick={() => setSortBy('vulnerability')}
            className={`px-2 py-0.5 rounded ${
              sortBy === 'vulnerability' ? 'bg-slate-800 text-slate-200 font-bold' : 'text-slate-400'
            }`}
          >
            Risk
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`px-2 py-0.5 rounded ${
              sortBy === 'name' ? 'bg-slate-800 text-slate-200 font-bold' : 'text-slate-400'
            }`}
          >
            Name
          </button>
        </div>
      </div>

      {/* Table Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
              <th className="py-2.5 px-4 font-semibold">Package</th>
              <th className="py-2.5 px-3 font-semibold">Ecosystem</th>
              <th className="py-2.5 px-3 font-semibold">Current</th>
              <th className="py-2.5 px-3 font-semibold">Latest</th>
              <th className="py-2.5 px-3 font-semibold">Security Status</th>
              <th className="py-2.5 px-4 font-semibold">Advisory</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                  No dependencies match current filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((dep, idx) => {
                const isVuln = dep.vulnerability_flag;
                const isOutdated = dep.current_version && dep.latest_version && dep.current_version !== dep.latest_version;

                return (
                  <tr
                    key={dep.id || idx}
                    className="hover:bg-slate-900/40 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-semibold text-slate-200">
                      {dep.package_name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 uppercase text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {dep.ecosystem || 'npm'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {dep.current_version || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={isOutdated ? 'text-amber-400 font-medium' : 'text-slate-400'}>
                        {dep.latest_version || dep.current_version || 'N/A'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {isVuln ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-rose-950/70 text-rose-300 border border-rose-800/60">
                          <ShieldAlert className="w-3 h-3 text-rose-400" />
                          {dep.severity || 'Vulnerable'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-medium bg-emerald-950/50 text-emerald-400 border border-emerald-800/50">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          Clean
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                      {dep.advisory_summary || (isOutdated ? 'Upgrade available' : 'Up to date')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
