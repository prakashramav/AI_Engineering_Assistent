'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
} from '@xyflow/react';
import { FileCode, ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';

function CustomModuleNode({ data }) {
  const router = useRouter();

  const handleOpen = () => {
    if (data.path && data.repoId) {
      router.push(`/repo/${data.repoId}/explore?file=${encodeURIComponent(data.path)}`);
    }
  };

  const isEntry = data.isEntryPoint;

  return (
    <div
      onClick={handleOpen}
      className={`px-3.5 py-2.5 rounded-lg border shadow-lg cursor-pointer transition-all hover:scale-105 select-none ${
        isEntry
          ? 'bg-slate-900 border-cyan-500/80 shadow-cyan-500/10'
          : 'bg-slate-900/90 border-slate-700/80 hover:border-indigo-500/80 shadow-slate-950/40'
      }`}
      style={{ minWidth: '180px' }}
    >
      <Handle type="target" position={Position.Top} className="!bg-cyan-400 !w-2 !h-2" />
      
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 truncate">
          <FileCode className={`w-3.5 h-3.5 ${isEntry ? 'text-cyan-400' : 'text-indigo-400'}`} />
          <span className="font-mono text-xs font-semibold text-slate-100 truncate">
            {data.label}
          </span>
        </div>
        {isEntry && (
          <span className="text-[9px] font-sans font-medium px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-0.5">
            <Zap className="w-2.5 h-2.5" /> Entry
          </span>
        )}
      </div>

      <div className="text-[10px] font-mono text-slate-400 truncate mb-2">
        {data.path}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1.5 border-t border-slate-800">
        <span className="text-slate-400 uppercase text-[9px] px-1 rounded bg-slate-800">
          {data.language || 'code'}
        </span>
        <div className="flex items-center gap-2">
          <span title="Inbound imports">in:{data.inDegree ?? 0}</span>
          <span title="Outbound imports">out:{data.outDegree ?? 0}</span>
          <ArrowUpRight className="w-3 h-3 text-slate-400 hover:text-cyan-300" />
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-indigo-400 !w-2 !h-2" />
    </div>
  );
}

export default function ArchitectureGraph({ repoId, graphData }) {
  const router = useRouter();

  const nodeTypes = useMemo(
    () => ({
      customModuleNode: CustomModuleNode,
    }),
    []
  );

  // Augment nodes with repoId
  const nodes = useMemo(() => {
    if (!graphData?.nodes) return [];
    return graphData.nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        repoId,
      },
    }));
  }, [graphData, repoId]);

  const edges = graphData?.edges || [];

  const onNodeClick = useCallback(
    (_, node) => {
      if (node?.data?.path) {
        router.push(`/repo/${repoId}/explore?file=${encodeURIComponent(node.data.path)}`);
      }
    },
    [repoId, router]
  );

  if (!nodes.length) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
        No module nodes available to render graph.
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded-lg border border-slate-800 overflow-hidden bg-slate-950">
      <div className="absolute top-3 left-3 z-10 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-md border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-3 shadow-md">
        <span>Nodes: <strong className="text-cyan-400">{nodes.length}</strong></span>
        <span className="text-slate-700">|</span>
        <span>Edges: <strong className="text-indigo-400">{edges.length}</strong></span>
        <span className="text-slate-700">|</span>
        <span className="text-[11px] text-slate-400">Click any module to inspect source code</span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.2}
        maxZoom={2.0}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls className="!bg-slate-900 !border-slate-800" />
        <MiniMap
          nodeColor="#6366f1"
          maskColor="rgba(15, 23, 42, 0.75)"
          className="!bg-slate-950 !border-slate-800 rounded-md"
        />
      </ReactFlow>
    </div>
  );
}
