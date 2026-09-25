from typing import List, Dict, Any, Optional, Tuple
import os
import re
import logging

logger = logging.getLogger(__name__)

# Try to initialize Tree-sitter parsers
PARSERS = {}
LANGUAGES = {}

try:
    from tree_sitter import Language, Parser
    
    # Python
    try:
        import tree_sitter_python
        py_lang = Language(tree_sitter_python.language())
        py_parser = Parser(py_lang)
        PARSERS["python"] = py_parser
        LANGUAGES["python"] = py_lang
    except Exception as e:
        logger.warning(f"Failed to load tree-sitter python: {e}")

    # JavaScript
    try:
        import tree_sitter_javascript
        js_lang = Language(tree_sitter_javascript.language())
        js_parser = Parser(js_lang)
        PARSERS["javascript"] = js_parser
        LANGUAGES["javascript"] = js_lang
    except Exception as e:
        logger.warning(f"Failed to load tree-sitter javascript: {e}")

    # TypeScript
    try:
        import tree_sitter_typescript
        ts_lang = Language(tree_sitter_typescript.language_typescript())
        ts_parser = Parser(ts_lang)
        PARSERS["typescript"] = ts_parser
        LANGUAGES["typescript"] = ts_lang
    except Exception as e:
        logger.warning(f"Failed to load tree-sitter typescript: {e}")

except Exception as e:
    logger.warning(f"Tree-sitter module loading issue: {e}")


def detect_language(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    mapping = {
        ".py": "python",
        ".js": "javascript",
        ".jsx": "javascript",
        ".mjs": "javascript",
        ".cjs": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".json": "json",
        ".md": "markdown",
        ".html": "html",
        ".css": "css",
        ".sql": "sql",
        ".sh": "bash",
        ".yml": "yaml",
        ".yaml": "yaml",
        ".go": "go",
        ".rs": "rust",
        ".java": "java",
    }
    return mapping.get(ext, "unknown")


class ParsedChunk:
    def __init__(
        self,
        symbol_name: Optional[str],
        symbol_type: str,
        start_line: int,
        end_line: int,
        start_byte: int,
        end_byte: int,
        content: str,
        surrounding_context: str = "",
    ):
        self.symbol_name = symbol_name
        self.symbol_type = symbol_type
        self.start_line = start_line
        self.end_line = end_line
        self.start_byte = start_byte
        self.end_byte = end_byte
        self.content = content
        self.surrounding_context = surrounding_context

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol_name": self.symbol_name,
            "symbol_type": self.symbol_type,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "start_byte": self.start_byte,
            "end_byte": self.end_byte,
            "content": self.content,
            "surrounding_context": self.surrounding_context,
        }


class CodeParserService:
    """
    Language-aware code parser using Tree-Sitter with smart AST chunking.
    Extracts functions, classes, imports, and symbol references with exact line numbers.
    """

    def parse_file(self, file_path: str, code_content: str) -> Tuple[List[ParsedChunk], List[str]]:
        """
        Parses a source file into:
        1. List of ParsedChunk objects (functions, classes, modules)
        2. List of imported module names (for dependency graph)
        """
        language = detect_language(file_path)
        content_bytes = code_content.encode("utf-8")
        lines = code_content.splitlines()

        if language in PARSERS:
            try:
                return self._parse_with_tree_sitter(language, content_bytes, lines)
            except Exception as e:
                logger.error(f"Tree-sitter parse error for {file_path}: {e}. Using regex fallback.")

        return self._parse_fallback(file_path, code_content, lines)

    def _parse_with_tree_sitter(
        self, language: str, content_bytes: bytes, lines: List[str]
    ) -> Tuple[List[ParsedChunk], List[str]]:
        parser = PARSERS[language]
        tree = parser.parse(content_bytes)
        root = tree.root_node

        chunks: List[ParsedChunk] = []
        imports: List[str] = []
        import_snippets: List[str] = []

        def get_node_text(node) -> str:
            return content_bytes[node.start_byte : node.end_byte].decode("utf-8", errors="replace")

        # First pass: collect top-level imports to use as surrounding context
        for child in root.children:
            ntype = child.type
            if language == "python" and ntype in ("import_statement", "import_from_statement"):
                txt = get_node_text(child).strip()
                import_snippets.append(txt)
                # extract imported module name
                match = re.search(r"from\s+([A-Za-z0-9_\.]+)", txt)
                if match:
                    imports.append(match.group(1))
                else:
                    match2 = re.search(r"import\s+([A-Za-z0-9_\.]+)", txt)
                    if match2:
                        imports.append(match2.group(1))
            elif language in ("javascript", "typescript") and ntype in ("import_statement", "export_statement"):
                txt = get_node_text(child).strip()
                import_snippets.append(txt)
                match = re.search(r"from\s+['\"]([^'\"]+)['\"]", txt)
                if match:
                    imports.append(match.group(1))
                elif "require(" in txt:
                    match2 = re.search(r"require\(['\"]([^'\"]+)['\"]", txt)
                    if match2:
                        imports.append(match2.group(1))

        context_header = "\n".join(import_snippets[:15]) if import_snippets else ""

        # Second pass: extract functions and classes
        def walk_node(node, parent_class: Optional[str] = None):
            ntype = node.type
            
            # --- Python Handling ---
            if language == "python":
                if ntype in ("function_definition", "async_function_definition"):
                    name_node = node.child_by_field_name("name")
                    name = name_node.text.decode("utf-8") if name_node else "anonymous_func"
                    full_name = f"{parent_class}.{name}" if parent_class else name
                    
                    chunk = ParsedChunk(
                        symbol_name=full_name,
                        symbol_type="method" if parent_class else "function",
                        start_line=node.start_point.row + 1,
                        end_line=node.end_point.row + 1,
                        start_byte=node.start_byte,
                        end_byte=node.end_byte,
                        content=get_node_text(node),
                        surrounding_context=context_header,
                    )
                    chunks.append(chunk)
                    return  # Do not recurse into nested function bodies as separate top chunks

                elif ntype == "class_definition":
                    name_node = node.child_by_field_name("name")
                    class_name = name_node.text.decode("utf-8") if name_node else "AnonymousClass"
                    
                    chunk = ParsedChunk(
                        symbol_name=class_name,
                        symbol_type="class",
                        start_line=node.start_point.row + 1,
                        end_line=node.end_point.row + 1,
                        start_byte=node.start_byte,
                        end_byte=node.end_byte,
                        content=get_node_text(node),
                        surrounding_context=context_header,
                    )
                    chunks.append(chunk)

                    # Also extract individual methods inside the class
                    body = node.child_by_field_name("body")
                    if body:
                        for child in body.children:
                            walk_node(child, parent_class=class_name)
                    return

            # --- JavaScript / TypeScript Handling ---
            elif language in ("javascript", "typescript"):
                if ntype in ("function_declaration", "generator_function_declaration"):
                    name_node = node.child_by_field_name("name")
                    name = name_node.text.decode("utf-8") if name_node else "anonymous_func"
                    full_name = f"{parent_class}.{name}" if parent_class else name
                    
                    chunks.append(
                        ParsedChunk(
                            symbol_name=full_name,
                            symbol_type="method" if parent_class else "function",
                            start_line=node.start_point.row + 1,
                            end_line=node.end_point.row + 1,
                            start_byte=node.start_byte,
                            end_byte=node.end_byte,
                            content=get_node_text(node),
                            surrounding_context=context_header,
                        )
                    )
                    return

                elif ntype == "class_declaration":
                    name_node = node.child_by_field_name("name")
                    class_name = name_node.text.decode("utf-8") if name_node else "AnonymousClass"
                    
                    chunks.append(
                        ParsedChunk(
                            symbol_name=class_name,
                            symbol_type="class",
                            start_line=node.start_point.row + 1,
                            end_line=node.end_point.row + 1,
                            start_byte=node.start_byte,
                            end_byte=node.end_byte,
                            content=get_node_text(node),
                            surrounding_context=context_header,
                        )
                    )
                    body = node.child_by_field_name("body")
                    if body:
                        for child in body.children:
                            walk_node(child, parent_class=class_name)
                    return

                elif ntype == "method_definition":
                    name_node = node.child_by_field_name("name")
                    name = name_node.text.decode("utf-8") if name_node else "anonymous_method"
                    full_name = f"{parent_class}.{name}" if parent_class else name
                    
                    chunks.append(
                        ParsedChunk(
                            symbol_name=full_name,
                            symbol_type="method",
                            start_line=node.start_point.row + 1,
                            end_line=node.end_point.row + 1,
                            start_byte=node.start_byte,
                            end_byte=node.end_byte,
                            content=get_node_text(node),
                            surrounding_context=context_header,
                        )
                    )
                    return

                elif ntype in ("lexical_declaration", "variable_declaration"):
                    # Check for const foo = () => {} or const foo = function() {}
                    text = get_node_text(node)
                    if "=>" in text or "function" in text:
                        match = re.search(r"(const|let|var)\s+([A-Za-z0-9_]+)\s*=", text)
                        var_name = match.group(2) if match else "anonymous_var"
                        chunks.append(
                            ParsedChunk(
                                symbol_name=var_name,
                                symbol_type="function",
                                start_line=node.start_point.row + 1,
                                end_line=node.end_point.row + 1,
                                start_byte=node.start_byte,
                                end_byte=node.end_byte,
                                content=text,
                                surrounding_context=context_header,
                            )
                        )
                        return

            for child in node.children:
                walk_node(child, parent_class)

        for child in root.children:
            walk_node(child)

        # If no functions/classes were detected (e.g. script or small file), create a module chunk
        if not chunks and lines:
            chunks.append(
                ParsedChunk(
                    symbol_name=os.path.basename(language),
                    symbol_type="module",
                    start_line=1,
                    end_line=len(lines),
                    start_byte=0,
                    end_byte=len(content_bytes),
                    content="\n".join(lines[:100]),
                    surrounding_context="",
                )
            )

        return chunks, list(set(imports))

    def _parse_fallback(
        self, file_path: str, code_content: str, lines: List[str]
    ) -> Tuple[List[ParsedChunk], List[str]]:
        """
        Regex-based smart structural parser for non-Tree-Sitter files or fallback.
        """
        chunks: List[ParsedChunk] = []
        imports: List[str] = []
        
        # Detect imports
        for line in lines:
            if line.startswith("import ") or line.startswith("from "):
                m = re.search(r"(?:from|import)\s+([A-Za-z0-9_\.]+)", line)
                if m:
                    imports.append(m.group(1))
            elif "require(" in line:
                m = re.search(r"require\(['\"]([^'\"]+)['\"]", line)
                if m:
                    imports.append(m.group(1))

        # Chunk by 60-line windows if no specific structure
        step = 50
        for i in range(0, max(1, len(lines)), step):
            window = lines[i : i + step]
            chunks.append(
                ParsedChunk(
                    symbol_name=f"{os.path.basename(file_path)}:L{i+1}-{min(len(lines), i+step)}",
                    symbol_type="block",
                    start_line=i + 1,
                    end_line=min(len(lines), i + step),
                    start_byte=0,
                    end_byte=0,
                    content="\n".join(window),
                    surrounding_context="",
                )
            )

        return chunks, list(set(imports))


parser_service = CodeParserService()

def get_parser_service() -> CodeParserService:
    return parser_service
