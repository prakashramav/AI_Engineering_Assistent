// Comprehensive mock data fixtures for offline/fixture preview mode
export const MOCK_REPOS = [
  {
    id: 1,
    github_url: "https://github.com/developer/ai-sample-service",
    owner: "developer",
    name: "ai-sample-service",
    default_branch: "main",
    status: "ready",
    status_message: "Repository indexed and ready for deep code intelligence.",
    indexing_progress: 100,
    languages: { JavaScript: 65, Python: 25, JSON: 10 },
    architecture_summary: "ai-sample-service is structured as a modular Node.js/Express service composed of 4 core modules. Primary entry points: src/index.js with JWT authentication middleware and async data proxy services.",
    entry_points: ["src/index.js", "src/auth/middleware.js"],
    total_files: 4,
    total_chunks: 8,
    last_indexed_sha: "a9f82d1",
    updated_at: "2026-03-25T14:22:00Z"
  }
];

export const MOCK_FILE_TREE = {
  name: "ai-sample-service",
  type: "directory",
  path: "",
  children: [
    {
      name: "package.json",
      type: "file",
      path: "package.json",
      language: "json",
      size: 260
    },
    {
      name: "src",
      type: "directory",
      path: "src",
      children: [
        {
          name: "index.js",
          type: "file",
          path: "src/index.js",
          language: "javascript",
          size: 680
        },
        {
          name: "auth",
          type: "directory",
          path: "src/auth",
          children: [
            {
              name: "middleware.js",
              type: "file",
              path: "src/auth/middleware.js",
              language: "javascript",
              size: 720
            }
          ]
        },
        {
          name: "services",
          type: "directory",
          path: "src/services",
          children: [
            {
              name: "dataService.js",
              type: "file",
              path: "src/services/dataService.js",
              language: "javascript",
              size: 510
            }
          ]
        }
      ]
    }
  ]
};

export const MOCK_FILE_CONTENTS = {
  "src/auth/middleware.js": {
    path: "src/auth/middleware.js",
    content: `import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "default_insecure_secret_key";

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }

  // Potential Vulnerability: Insecure algorithm verification
  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

export function generateAccessToken(payload) {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
}`,
    total_lines: 26,
    chunks: [
      { symbol_name: "authenticateToken", symbol_type: "function", start_line: 5, end_line: 21 },
      { symbol_name: "generateAccessToken", symbol_type: "function", start_line: 23, end_line: 25 }
    ]
  },
  "src/services/dataService.js": {
    path: "src/services/dataService.js",
    content: `import axios from 'axios';
import { authenticateToken } from '../auth/middleware.js';

export class DataService {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.cache = new Map();
  }

  async fetchRecords(filterQuery) {
    // Potential Bug: Unhandled async promise rejection risk
    const response = await axios.get(\`\${this.endpoint}/items?q=\${filterQuery}\`);
    this.cache.set(filterQuery, response.data);
    return response.data;
  }

  getCache(key) {
    return this.cache.get(key);
  }
}`,
    total_lines: 19,
    chunks: [
      { symbol_name: "DataService", symbol_type: "class", start_line: 4, end_line: 18 },
      { symbol_name: "DataService.fetchRecords", symbol_type: "method", start_line: 10, end_line: 15 }
    ]
  },
  "src/index.js": {
    path: "src/index.js",
    content: `import express from 'express';
import { authenticateToken } from './auth/middleware.js';
import { DataService } from './services/dataService.js';

const app = express();
const port = process.env.PORT || 3000;
const dataService = new DataService("https://api.internal.service");

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/data', authenticateToken, async (req, res) => {
  try {
    const data = await dataService.fetchRecords(req.query.search || "");
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});`,
    total_lines: 27,
    chunks: [
      { symbol_name: "index.js", symbol_type: "module", start_line: 1, end_line: 27 }
    ]
  },
  "package.json": {
    path: "package.json",
    content: `{
  "name": "ai-sample-service",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.19.2",
    "jsonwebtoken": "^8.5.1",
    "axios": "1.6.0",
    "lodash": "4.17.15"
  },
  "devDependencies": {
    "vitest": "^1.4.0"
  }
}`,
    total_lines: 12,
    chunks: []
  }
};

export const MOCK_GRAPH_DATA = {
  nodes: [
    {
      id: "src/index.js",
      type: "customModuleNode",
      position: { x: 50, y: 150 },
      data: { label: "index.js", path: "src/index.js", language: "javascript", size: 680, inDegree: 0, outDegree: 2, isEntryPoint: true }
    },
    {
      id: "src/auth/middleware.js",
      type: "customModuleNode",
      position: { x: 380, y: 60 },
      data: { label: "middleware.js", path: "src/auth/middleware.js", language: "javascript", size: 720, inDegree: 2, outDegree: 0, isEntryPoint: false }
    },
    {
      id: "src/services/dataService.js",
      type: "customModuleNode",
      position: { x: 380, y: 240 },
      data: { label: "dataService.js", path: "src/services/dataService.js", language: "javascript", size: 510, inDegree: 1, outDegree: 1, isEntryPoint: false }
    },
    {
      id: "package.json",
      type: "customModuleNode",
      position: { x: 50, y: 340 },
      data: { label: "package.json", path: "package.json", language: "json", size: 260, inDegree: 0, outDegree: 0, isEntryPoint: false }
    }
  ],
  edges: [
    { id: "e1", source: "src/index.js", target: "src/auth/middleware.js", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 }, label: "imports" },
    { id: "e2", source: "src/index.js", target: "src/services/dataService.js", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 }, label: "imports" },
    { id: "e3", source: "src/services/dataService.js", target: "src/auth/middleware.js", animated: true, style: { stroke: "#8b5cf6", strokeWidth: 2 }, label: "imports" }
  ],
  stats: {
    totalNodes: 4,
    totalEdges: 3,
    entryPoints: ["src/index.js"],
    density: 0.25,
    hasCycles: false,
    cycleCount: 0
  }
};

export const MOCK_DEPENDENCIES = [
  {
    id: 1,
    package_name: "lodash",
    current_version: "4.17.15",
    latest_version: "4.17.21",
    vulnerability_flag: true,
    severity: "high",
    advisory_summary: "CVE-2021-23337: Command Injection via template function in lodash",
    ecosystem: "npm",
    manifest_path: "package.json"
  },
  {
    id: 2,
    package_name: "jsonwebtoken",
    current_version: "8.5.1",
    latest_version: "9.0.2",
    vulnerability_flag: true,
    severity: "high",
    advisory_summary: "CVE-2022-23529: Insecure key verification in jwt.verify",
    ecosystem: "npm",
    manifest_path: "package.json"
  },
  {
    id: 3,
    package_name: "axios",
    current_version: "1.6.0",
    latest_version: "1.7.7",
    vulnerability_flag: true,
    severity: "medium",
    advisory_summary: "CVE-2024-39338: Server-Side Request Forgery (SSRF) bypass",
    ecosystem: "npm",
    manifest_path: "package.json"
  },
  {
    id: 4,
    package_name: "express",
    current_version: "4.19.2",
    latest_version: "4.21.0",
    vulnerability_flag: false,
    severity: "none",
    advisory_summary: null,
    ecosystem: "npm",
    manifest_path: "package.json"
  }
];

export const MOCK_BUGS = [
  {
    id: 101,
    file_path: "src/auth/middleware.js",
    line_range: "14-22",
    start_line: 14,
    end_line: 22,
    severity: "high",
    category: "security",
    title: "Unrestricted Algorithm Verification in jwt.verify",
    description: "Calling jwt.verify without specifying the allowed algorithms allows malicious tokens with 'none' or asymmetric key confusion attacks.",
    suggested_fix: "Pass explicit algorithm options: jwt.verify(token, ACCESS_TOKEN_SECRET, { algorithms: ['HS256'] }, callback)"
  },
  {
    id: 102,
    file_path: "src/services/dataService.js",
    line_range: "10-15",
    start_line: 10,
    end_line: 15,
    severity: "medium",
    category: "concurrency",
    title: "Unhandled HTTP Request Failure & Cache Inconsistency",
    description: "If axios.get rejects, the exception propagates unhandled to caller and leaves the cache in an unverified state without timeout bounds.",
    suggested_fix: "Wrap network request in a try/catch block with explicit timeout config: { timeout: 5000 }"
  }
];

export const MOCK_COMMITS = [
  {
    sha: "a9f82d1",
    message: "feat: add JWT authentication middleware and token extraction",
    author: "Arjun Developer",
    date: "2026-03-25T11:45:00Z",
    ai_summary: "Introduces token authentication middleware with header parsing and bearer validation."
  },
  {
    sha: "b4c10e8",
    message: "refactor: extract dataService caching and endpoints",
    author: "Arjun Developer",
    date: "2026-03-24T18:10:00Z",
    ai_summary: "Modularizes HTTP data fetching into dedicated DataService class with in-memory cache."
  },
  {
    sha: "e8812fa",
    message: "chore: initial project scaffold and dependency setup",
    author: "Arjun Developer",
    date: "2026-03-23T09:30:00Z",
    ai_summary: "Initializes Express server, package.json dependencies, and configuration setup."
  }
];

export const MOCK_PR = {
  id: 1,
  pr_number: 1,
  pr_title: "feat: enhance authentication error handling & token refresh",
  summary: "PR #1 improves token validation by replacing raw HTTP 401 status codes with structured JSON error responses and prepares support for token rotation.",
  risk_level: "medium",
  diff: `diff --git a/src/auth/middleware.js b/src/auth/middleware.js
index 83a1b2c..94d2e3f 100644
--- a/src/auth/middleware.js
+++ b/src/auth/middleware.js
@@ -15,8 +15,14 @@ export async function authenticateToken(req, res, next) {
   const authHeader = req.headers['authorization'];
   const token = authHeader && authHeader.split(' ')[1];
 
-  if (!token) return res.sendStatus(401);
+  if (!token) {
+    return res.status(401).json({ error: 'Missing Bearer token' });
+  }
 
-  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
-    if (err) return res.sendStatus(403);
+  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, { algorithms: ['HS256'] }, (err, user) => {
+    if (err) {
+      console.error('JWT Verification Error:', err.message);
+      return res.status(403).json({ error: 'Token expired or invalid signature' });
+    }
     req.user = user;
     next();
   });`,
  comments: [
    {
      file: "src/auth/middleware.js",
      line: 21,
      severity: "high",
      issue: "Algorithm Configuration Hardcoding",
      suggestion: "Make allowed algorithms configurable via environment variables rather than hardcoding ['HS256']."
    },
    {
      file: "src/auth/middleware.js",
      line: 23,
      severity: "medium",
      issue: "Console Error Leakage",
      suggestion: "Avoid logging err.message directly in production without a structured logger to prevent internal error leakage."
    }
  ]
};

export const MOCK_QA_SESSIONS = [
  {
    id: 1,
    question: "Why might authenticateToken fail with 401?",
    answer: `Based on codebase analysis in \`src/auth/middleware.js:5-21\`:

### Root Cause Analysis
The \`authenticateToken\` function enforces authorization credentials before any request hits downstream handlers. It will fail with **HTTP 401 Unauthorized** under the following conditions:

1. **Missing Authorization Header**: When the client fails to provide the \`Authorization\` HTTP header (\`req.headers['authorization']\` evaluates to \`undefined\`).
2. **Malformed Bearer Token**: If the header does not follow the standard \`Bearer <token>\` structure, \`authHeader.split(' ')[1]\` yields \`undefined\`.

Relevant implementation:
\`\`\`javascript
// src/auth/middleware.js:7-13
const authHeader = req.headers['authorization'];
const token = authHeader && authHeader.split(' ')[1];

if (!token) {
  return res.status(401).json({ error: 'Missing Bearer token' });
}
\`\`\`

### Architectural Callers
- \`src/index.js:18\` mounts this middleware on the \`/api/data\` route. Any unauthenticated caller will be intercepted immediately.`,
    cited_chunks: [
      {
        file_path: "src/auth/middleware.js",
        line_range: "5-21",
        start_line: 5,
        end_line: 21,
        symbol: "authenticateToken"
      },
      {
        file_path: "src/index.js",
        line_range: "18-24",
        start_line: 18,
        end_line: 24,
        symbol: "app.get('/api/data')"
      }
    ],
    created_at: "2026-03-25T15:00:00Z"
  }
];
