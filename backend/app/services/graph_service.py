from typing import List, Dict, Any, Set, Tuple
import os
import networkx as nx
import logging
from ..db.models import DependencyGraphEdge, FileRecord

logger = logging.getLogger(__name__)

class GraphService:
    """
    Extracts, persists, and analyzes architectural dependency graphs (modules, imports, calls).
    Outputs ready-to-render React Flow nodes and edges.
    """

    def build_graph(
        self,
        files: List[FileRecord],
        edges: List[DependencyGraphEdge],
    ) -> Dict[str, Any]:
        """
        Builds a NetworkX DiGraph and outputs visual layout data with node metrics.
        """
        G = nx.DiGraph()

        file_lookup: Dict[str, FileRecord] = {}
        for f in files:
            # Normalize path
            norm_path = f.path.replace("\\", "/")
            file_lookup[norm_path] = f
            # Also map module name (without extension)
            base_module = os.path.splitext(norm_path)[0]
            file_lookup[base_module] = f
            G.add_node(norm_path, file=f)

        for edge in edges:
            source = edge.from_module.replace("\\", "/")
            target = edge.to_module.replace("\\", "/")
            G.add_edge(source, target, import_stmt=edge.import_statement)

        # Detect entry points
        entry_points = []
        for node in G.nodes():
            in_degree = G.in_degree(node)
            base = os.path.basename(node).lower()
            if in_degree == 0 or any(base.startswith(ep) for ep in ["main", "index", "app", "server", "cli", "__init__"]):
                entry_points.append(node)

        # Generate React Flow nodes and edges with hierarchical layout coordinates
        nodes_out = []
        edges_out = []

        # Simple layered circular / grid layout calculation
        node_list = list(G.nodes())
        cols = max(3, int(len(node_list) ** 0.5) + 1)

        for i, node_id in enumerate(node_list):
            f_record = file_lookup.get(node_id)
            lang = f_record.language if f_record else "unknown"
            size = f_record.size_bytes if f_record else 100
            
            in_deg = G.in_degree(node_id)
            out_deg = G.out_degree(node_id)
            is_entry = node_id in entry_points

            # Coordinates for React Flow canvas
            col = i % cols
            row = i // cols
            x = col * 280 + (row % 2) * 40
            y = row * 160

            node_type = "default"
            if is_entry:
                node_type = "input"
            elif out_deg == 0 and in_deg > 0:
                node_type = "output"

            nodes_out.append({
                "id": node_id,
                "type": "customModuleNode",
                "position": {"x": x, "y": y},
                "data": {
                    "label": os.path.basename(node_id),
                    "path": node_id,
                    "language": lang,
                    "size": size,
                    "inDegree": in_deg,
                    "outDegree": out_deg,
                    "isEntryPoint": is_entry,
                    "nodeType": node_type,
                }
            })

        for edge_idx, (u, v, data) in enumerate(G.edges(data=True)):
            edges_out.append({
                "id": f"e-{u}-{v}-{edge_idx}",
                "source": u,
                "target": v,
                "animated": True,
                "style": {"stroke": "#6366f1", "strokeWidth": 1.5},
                "label": "imports",
                "data": {
                    "statement": data.get("import_stmt", "")
                }
            })

        # Calculate graph stats
        density = nx.density(G) if len(G) > 1 else 0
        cycles = []
        try:
            cycles = list(nx.simple_cycles(G))[:5]
        except Exception:
            pass

        return {
            "nodes": nodes_out,
            "edges": edges_out,
            "stats": {
                "totalNodes": len(nodes_out),
                "totalEdges": len(edges_out),
                "entryPoints": entry_points,
                "density": round(density, 4),
                "hasCycles": len(cycles) > 0,
                "cycleCount": len(cycles),
            }
        }

    def resolve_import_path(self, current_file: str, import_target: str, all_files: Set[str]) -> str:
        """
        Resolves relative and package imports to actual file paths in the repo.
        E.g.: 'from .models import User' inside 'app/db/session.py' -> 'app/db/models.py'
        """
        curr_dir = os.path.dirname(current_file)
        
        # Check relative JS/TS or Python import
        if import_target.startswith("."):
            clean_target = import_target.lstrip("./")
            candidate = os.path.normpath(os.path.join(curr_dir, clean_target)).replace("\\", "/")
            for ext in ["", ".py", ".js", ".ts", ".jsx", ".tsx", "/index.js", "/index.ts"]:
                cand_ext = candidate + ext
                if cand_ext in all_files:
                    return cand_ext

        # Direct match by path
        norm_target = import_target.replace(".", "/").replace("\\", "/")
        for f in all_files:
            if norm_target in f:
                return f

        return import_target


graph_service = GraphService()

def get_graph_service() -> GraphService:
    return graph_service
