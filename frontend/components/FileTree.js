'use client';

import { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  ChevronRight,
  ChevronDown,
  Search,
} from 'lucide-react';

function getFileIcon(fileName) {
  if (fileName.endsWith('.js') || fileName.endsWith('.jsx') || fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
    return <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
  }
  if (fileName.endsWith('.py')) {
    return <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  }
  if (fileName.endsWith('.json')) {
    return <FileJson className="w-3.5 h-3.5 text-yellow-300 shrink-0" />;
  }
  if (fileName.endsWith('.md')) {
    return <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  }
  return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
}

function TreeNode({ node, activeFile, onSelectFile, level = 0 }) {
  const [isOpen, setIsOpen] = useState(true);
  const isDirectory = node.type === 'directory';
  const isSelected = activeFile === node.path;

  if (isDirectory) {
    return (
      <div>
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          className="flex items-center gap-1.5 py-1 px-2 text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded cursor-pointer select-none transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )}
          {isOpen ? (
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {isOpen && node.children && (
          <div>
            {node.children.map((child, idx) => (
              <TreeNode
                key={child.path || `${child.name}-${idx}`}
                node={child}
                activeFile={activeFile}
                onSelectFile={onSelectFile}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelectFile(node.path)}
      style={{ paddingLeft: `${level * 12 + 16}px` }}
      className={`flex items-center justify-between py-1 px-2 text-xs font-mono rounded cursor-pointer select-none transition-colors ${
        isSelected
          ? 'bg-indigo-950/60 text-cyan-300 font-semibold border-l-2 border-cyan-400'
          : 'text-slate-300 hover:text-white hover:bg-slate-900/50'
      }`}
    >
      <div className="flex items-center gap-1.5 truncate">
        {getFileIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </div>
      {node.size && (
        <span className="text-[10px] text-slate-500 font-mono pl-2">
          {node.size > 1024 ? `${(node.size / 1024).toFixed(1)}k` : `${node.size}b`}
        </span>
      )}
    </div>
  );
}

export default function FileTree({ tree, activeFile, onSelectFile }) {
  const [filter, setFilter] = useState('');

  // Collect flat files if filtering
  const filterNodes = (node, term) => {
    if (!term) return node;
    if (node.type === 'file') {
      return node.name.toLowerCase().includes(term.toLowerCase()) ? node : null;
    }
    if (node.children) {
      const filteredChildren = node.children
        .map((c) => filterNodes(c, term))
        .filter(Boolean);
      if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
    }
    return null;
  };

  const displayedTree = tree ? filterNodes(tree, filter) : null;

  return (
    <div className="h-full flex flex-col bg-slate-950 border-r border-slate-800 text-slate-200">
      <div className="p-2.5 border-b border-slate-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search files..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-slate-900 text-xs font-mono text-slate-200 pl-8 pr-2 py-1.5 rounded border border-slate-800 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5">
        {displayedTree ? (
          <TreeNode
            node={displayedTree}
            activeFile={activeFile}
            onSelectFile={onSelectFile}
            level={0}
          />
        ) : (
          <div className="text-xs text-slate-500 font-mono p-4 text-center">
            No files match filter.
          </div>
        )}
      </div>
    </div>
  );
}
