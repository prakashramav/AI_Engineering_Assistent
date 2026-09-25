'use client';

import { use, useEffect, useState, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  History,
  FileCode,
  Loader2,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import CodeReferenceChip from '@/components/CodeReferenceChip';

export default function CodebaseQAPage({ params }) {
  const unwrappedParams = use(params);
  const repoId = unwrappedParams.id;

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestedQuestions = [
    'Why might authenticateToken fail with 401?',
    'What are the primary application entry points and routes?',
    'How does the DataService caching mechanism work?',
    'Are there any concurrency or security issues in this codebase?',
  ];

  useEffect(() => {
    if (!repoId) return;

    // Load past QA history
    api.getQAHistory(repoId).then((hist) => {
      setHistory(hist || []);
      if (hist && hist.length > 0) {
        // Pre-populate with initial Q&A
        const formatted = [];
        hist.slice(0, 3).forEach((h) => {
          formatted.push({ role: 'user', content: h.question });
          formatted.push({
            role: 'assistant',
            content: h.answer,
            cited_chunks: h.cited_chunks || [],
          });
        });
        setMessages(formatted);
      }
    });
  }, [repoId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setLoading(true);

    try {
      const res = await api.askQuestion(repoId, q);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer,
          cited_chunks: res.cited_chunks || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error generating response: ${err.message}`,
          cited_chunks: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedClick = (suggested) => {
    setQuestion(suggested);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main Chat Conversation Column */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 min-w-0">
        {/* Chat Header */}
        <div className="h-12 border-b border-slate-800 bg-slate-900/60 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
              Codebase Q&A (Hybrid RAG + Tree-Sitter)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Grounding responses in verified AST chunks
          </span>
        </div>

        {/* Message History */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.length === 0 && (
            <div className="max-w-xl mx-auto py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center mx-auto text-cyan-400 shadow-lg shadow-indigo-500/10">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-100 font-mono">
                Ask anything about this repository
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                Queries are answered using hybrid vector retrieval combined with symbol boosting
                and call-graph tracing, citing exact files and line ranges.
              </p>

              {/* Suggestions */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {suggestedQuestions.map((sq) => (
                  <button
                    key={sq}
                    onClick={() => handleSuggestedClick(sq)}
                    className="p-3 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-slate-300 hover:text-white transition-all text-left flex items-start justify-between group"
                  >
                    <span>{sq}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all mt-0.5 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 max-w-3xl ${
                msg.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-4 rounded-xl space-y-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white font-medium max-w-lg shadow-md'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-200 shadow-lg'
                }`}
              >
                {/* Content */}
                <div className="whitespace-pre-wrap font-sans text-xs">
                  {msg.content}
                </div>

                {/* Cited Chunks Bar */}
                {msg.cited_chunks && msg.cited_chunks.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-1.5 font-mono">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <FileCode className="w-3 h-3 text-cyan-400" />
                      <span>Referenced Code Chunks ({msg.cited_chunks.length}):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.cited_chunks.map((c, cIdx) => (
                        <CodeReferenceChip
                          key={cIdx}
                          repoId={repoId}
                          filePath={c.file_path}
                          lineRange={c.line_range}
                          startLine={c.start_line}
                          symbol={c.symbol}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 text-slate-400 font-mono text-xs">
              <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-cyan-400">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Searching vector store, boosting symbols, and synthesizing answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 shrink-0">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask a technical question about logic, bugs, or architecture..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
