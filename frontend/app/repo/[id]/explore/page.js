'use client';

import { use, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  FileCode,
  Sparkles,
  Bug,
  BookOpen,
  FlaskConical,
  Loader2,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import FileTree from '@/components/FileTree';
import CodeViewer from '@/components/CodeViewer';

export default function CodeExplorerPage({ params }) {
  const unwrappedParams = use(params);
  const repoId = unwrappedParams.id;
  const searchParams = useSearchParams();
  const router = useRouter();

  const fileParam = searchParams.get('file');
  const lineParam = searchParams.get('line');

  const [fileTree, setFileTree] = useState(null);
  const [activeFile, setActiveFile] = useState(fileParam || 'src/auth/middleware.js');
  const [fileData, setFileData] = useState({ content: '', language: 'javascript', chunks: [] });
  const [bugs, setBugs] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState(null);

  // Side panel tabs: 'explain' | 'bugs' | 'tests' | 'docs'
  const [inspectorTab, setInspectorTab] = useState('explain');
  const [aiOutput, setAiOutput] = useState({
    explain: '',
    tests: '',
    docs: '',
  });
  const [loadingAction, setLoadingAction] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!repoId) return;
    api.getFileTree(repoId).then((tree) => setFileTree(tree));
  }, [repoId]);

  useEffect(() => {
    if (fileParam && fileParam !== activeFile) {
      setActiveFile(fileParam);
    }
  }, [fileParam]);

  useEffect(() => {
    if (!repoId || !activeFile) return;

    // Load file content and chunks
    api.getFileContent(repoId, activeFile).then((res) => {
      const ext = activeFile.split('.').pop();
      let lang = 'javascript';
      if (ext === 'py') lang = 'python';
      else if (ext === 'json') lang = 'json';
      else if (ext === 'md') lang = 'markdown';
      else if (ext === 'ts' || ext === 'tsx') lang = 'typescript';

      setFileData({
        content: res.content || '',
        language: lang,
        chunks: res.chunks || [],
      });
      setSelectedSymbol(res.chunks?.[0] || null);
    });

    // Load bugs for this file
    api.getBugs(repoId, activeFile).then((b) => setBugs(b || []));
  }, [repoId, activeFile]);

  const handleSelectFile = (path) => {
    setActiveFile(path);
    router.push(`/repo/${repoId}/explore?file=${encodeURIComponent(path)}`);
  };

  const handleSelectSymbol = (chunk) => {
    setSelectedSymbol(chunk);
    router.push(`/repo/${repoId}/explore?file=${encodeURIComponent(activeFile)}&line=${chunk.start_line}`);
  };

  // Actions
  const handleExplain = async () => {
    setLoadingAction(true);
    setInspectorTab('explain');
    try {
      const exp = await api.explainFile(repoId, activeFile);
      setAiOutput((prev) => ({ ...prev, explain: exp }));
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDetectBugs = async () => {
    setLoadingAction(true);
    setInspectorTab('bugs');
    try {
      const newBugs = await api.analyzeBugs(repoId, activeFile);
      setBugs(newBugs);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleGenerateTests = async () => {
    setLoadingAction(true);
    setInspectorTab('tests');
    try {
      const tests = await api.generateTests(repoId, activeFile, selectedSymbol?.symbol_name || '');
      setAiOutput((prev) => ({ ...prev, tests }));
    } finally {
      setLoadingAction(false);
    }
  };

  const handleGenerateDocs = async () => {
    setLoadingAction(true);
    setInspectorTab('docs');
    try {
      const docs = await api.generateDocs(repoId, activeFile);
      setAiOutput((prev) => ({ ...prev, docs }));
    } finally {
      setLoadingAction(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Pane: File Tree (260px) */}
      <div className="w-64 shrink-0 h-full">
        <FileTree
          tree={fileTree}
          activeFile={activeFile}
          onSelectFile={handleSelectFile}
        />
      </div>

      {/* Center Pane: Code Viewer with syntax highlight and gutter bugs */}
      <div className="flex-1 h-full min-w-0 flex flex-col">
        <CodeViewer
          code={fileData.content}
          language={fileData.language}
          filePath={activeFile}
          targetLine={lineParam}
          bugs={bugs}
          chunks={fileData.chunks}
          onSelectSymbol={handleSelectSymbol}
        />
      </div>

      {/* Right Pane: AI Code Intelligence Inspector (380px) */}
      <div className="w-96 shrink-0 h-full border-l border-slate-800 bg-slate-950 flex flex-col font-mono text-xs">
        {/* Action Buttons Toolbar */}
        <div className="p-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-1 overflow-x-auto shrink-0">
          <button
            onClick={handleExplain}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors ${
              inspectorTab === 'explain'
                ? 'bg-slate-800 text-cyan-300 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Explain</span>
          </button>

          <button
            onClick={handleDetectBugs}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors ${
              inspectorTab === 'bugs'
                ? 'bg-slate-800 text-amber-300 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bug className="w-3.5 h-3.5 text-amber-400" />
            <span>Bugs ({bugs.length})</span>
          </button>

          <button
            onClick={handleGenerateTests}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors ${
              inspectorTab === 'tests'
                ? 'bg-slate-800 text-emerald-300 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tests</span>
          </button>

          <button
            onClick={handleGenerateDocs}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors ${
              inspectorTab === 'docs'
                ? 'bg-slate-800 text-blue-300 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>Docs</span>
          </button>
        </div>

        {/* Selected Symbol Context Bar */}
        {selectedSymbol && (
          <div className="px-3 py-1.5 bg-slate-900/30 border-b border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="truncate">
              Focus: <strong className="text-slate-200">{selectedSymbol.symbol_name}</strong>
            </span>
            <span className="text-slate-500">L{selectedSymbol.start_line}-{selectedSymbol.end_line}</span>
          </div>
        )}

        {/* Inspector Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
          {loadingAction ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="font-mono text-xs">Reasoning with Gemini...</span>
            </div>
          ) : inspectorTab === 'explain' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Architectural Explanation
                </span>
                {aiOutput.explain && (
                  <button
                    onClick={() => copyToClipboard(aiOutput.explain)}
                    className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <div className="text-slate-300 leading-relaxed font-sans whitespace-pre-wrap bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                {aiOutput.explain || (
                  <div className="space-y-3 text-slate-400">
                    <p>
                      Click <strong>Explain</strong> above to run an on-demand deep architectural breakdown of{' '}
                      <code className="text-cyan-300">{activeFile}</code>.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Evaluates control flow, edge cases, complexity, and surrounding imports.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : inspectorTab === 'bugs' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Detected File Issues ({bugs.length})
                </span>
                <button
                  onClick={handleDetectBugs}
                  className="text-[11px] font-mono text-cyan-400 hover:underline"
                >
                  Re-scan
                </button>
              </div>

              {bugs.length === 0 ? (
                <div className="p-4 text-center text-slate-500 font-mono text-xs bg-slate-900/30 rounded border border-slate-800">
                  No vulnerabilities or logic flaws detected in this file.
                </div>
              ) : (
                bugs.map((b, i) => (
                  <div
                    key={b.id || i}
                    className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80">
                        {b.severity}
                      </span>
                      <button
                        onClick={() => router.push(`/repo/${repoId}/explore?file=${encodeURIComponent(activeFile)}&line=${b.start_line}`)}
                        className="text-[11px] font-mono text-cyan-400 hover:underline"
                      >
                        Line {b.line_range}
                      </button>
                    </div>
                    <h4 className="font-semibold text-slate-200">{b.title}</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">{b.description}</p>
                    {b.suggested_fix && (
                      <div className="p-2 rounded bg-slate-950 border border-slate-800/80 text-[11px] font-mono text-slate-300">
                        Fix: {b.suggested_fix}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : inspectorTab === 'tests' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Generated Unit Tests
                </span>
                {aiOutput.tests && (
                  <button
                    onClick={() => copyToClipboard(aiOutput.tests)}
                    className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-slate-200 font-mono text-xs leading-relaxed whitespace-pre overflow-x-auto">
                {aiOutput.tests || 'Click Tests above to generate a unit test suite with edge cases and mocks.'}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Generated Documentation
                </span>
                {aiOutput.docs && (
                  <button
                    onClick={() => copyToClipboard(aiOutput.docs)}
                    className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-slate-300 font-sans text-xs leading-relaxed whitespace-pre-wrap">
                {aiOutput.docs || 'Click Docs above to generate module documentation and README usage guide.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
