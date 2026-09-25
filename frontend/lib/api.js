import {
  MOCK_REPOS,
  MOCK_FILE_TREE,
  MOCK_FILE_CONTENTS,
  MOCK_GRAPH_DATA,
  MOCK_DEPENDENCIES,
  MOCK_BUGS,
  MOCK_COMMITS,
  MOCK_PR,
  MOCK_QA_SESSIONS,
} from './mockData';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

class ApiClient {
  constructor() {
    this.useMock = false;
  }

  setMockMode(enable) {
    this.useMock = enable;
    if (typeof window !== 'undefined') {
      localStorage.setItem('engineering_assistant_mock_mode', enable ? 'true' : 'false');
    }
  }

  isMockMode() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('engineering_assistant_mock_mode') === 'true';
    }
    return this.useMock;
  }

  async _fetch(endpoint, options = {}) {
    if (this.isMockMode()) {
      return null; // Signals to use mock response
    }

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API error ${res.status}: ${errorText}`);
      }

      return await res.json();
    } catch (err) {
      console.warn(`Backend fetch failed for ${endpoint}: ${err.message}. Falling back to client-side data.`);
      return null;
    }
  }

  // --- Repositories ---
  async connectRepo(githubUrl, token = '') {
    const data = await this._fetch('/repos/connect', {
      method: 'POST',
      body: JSON.stringify({ github_url: githubUrl, token }),
    });
    if (data) return data;

    // Mock fallback
    const repoId = MOCK_REPOS.length + 1;
    const parts = githubUrl.split('/');
    const repoName = parts[parts.length - 1] || 'new-repo';
    const owner = parts[parts.length - 2] || 'developer';
    return {
      id: repoId,
      github_url: githubUrl,
      owner,
      name: repoName,
      status: 'ready',
      message: 'Indexed successfully in mock environment.',
    };
  }

  async listRepos() {
    const data = await this._fetch('/repos');
    return data || MOCK_REPOS;
  }

  async getRepo(id) {
    const data = await this._fetch(`/repos/${id}`);
    if (data) return data;
    const found = MOCK_REPOS.find((r) => r.id === Number(id));
    return found || MOCK_REPOS[0];
  }

  async getIndexStatus(id) {
    const data = await this._fetch(`/repos/${id}/index-status`);
    if (data) return data;
    return {
      id: Number(id),
      status: 'ready',
      status_message: 'Ready for deep code intelligence.',
      progress: 100,
      total_files: 4,
      total_chunks: 8,
    };
  }

  subscribeIndexSSE(id, onEvent, onError) {
    if (this.isMockMode() || typeof window === 'undefined') {
      setTimeout(() => {
        onEvent({ step: 'ready', percent: 100, message: 'Ready.' });
      }, 500);
      return () => {};
    }

    const eventSource = new EventSource(`${BASE_URL}/repos/${id}/index-status?stream=true`);
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onEvent(parsed);
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };
    eventSource.onerror = (err) => {
      if (onError) onError(err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }

  async getRepoOverview(id) {
    const data = await this._fetch(`/repos/${id}/overview`);
    if (data) return data;
    const repo = await this.getRepo(id);
    return {
      repo_id: repo.id,
      name: repo.name,
      owner: repo.owner,
      languages: repo.languages || { JavaScript: 70, JSON: 30 },
      architecture_summary: repo.architecture_summary || 'Modular software architecture with clear entry points and separated service layers.',
      entry_points: repo.entry_points || ['src/index.js'],
      total_files: repo.total_files || 4,
      total_chunks: repo.total_chunks || 8,
      total_dependencies: 4,
      vulnerable_dependencies: 2,
      status: repo.status || 'ready',
      last_indexed_sha: repo.last_indexed_sha || 'a9f82d1',
    };
  }

  async getArchitectureGraph(id) {
    const data = await this._fetch(`/repos/${id}/architecture`);
    return data || MOCK_GRAPH_DATA;
  }

  // --- Files & Explorer ---
  async getFileTree(id) {
    const data = await this._fetch(`/repos/${id}/files/tree`);
    return data || MOCK_FILE_TREE;
  }

  async getFileContent(id, filePath) {
    const data = await this._fetch(`/repos/${id}/files/content?path=${encodeURIComponent(filePath)}`);
    if (data) return data;
    return MOCK_FILE_CONTENTS[filePath] || {
      path: filePath,
      content: '// File content not loaded from server.\nexport const placeholder = true;',
      total_lines: 2,
      chunks: [],
    };
  }

  async explainFile(id, filePath) {
    const data = await this._fetch(`/repos/${id}/files/explain`, {
      method: 'POST',
      body: JSON.stringify({ file_path: filePath }),
    });
    if (data) return data.explanation;
    return `### Architectural Explanation: \`${filePath}\`\nThis module encapsulates core functionality. It is designed to handle asynchronous requests with safety boundaries and exports reusable logic across the application.`;
  }

  async generateTests(id, filePath, symbolName = '') {
    const data = await this._fetch(`/repos/${id}/files/generate-tests`, {
      method: 'POST',
      body: JSON.stringify({ file_path: filePath, symbol_name: symbolName }),
    });
    if (data) return data.test_code;
    return `import { describe, it, expect } from 'vitest';\n\ndescribe('${symbolName || filePath}', () => {\n  it('executes expected happy path', () => {\n    expect(true).toBe(true);\n  });\n});`;
  }

  async generateDocs(id, filePath) {
    const data = await this._fetch(`/repos/${id}/files/generate-docs`, {
      method: 'POST',
      body: JSON.stringify({ file_path: filePath }),
    });
    if (data) return data.documentation;
    return `# Module Documentation: \`${filePath}\`\n\n## Purpose\nProvides isolated domain operations and maintains contract integrity across dependent modules.`;
  }

  // --- Q&A Chat ---
  async askQuestion(id, question) {
    const data = await this._fetch(`/repos/${id}/ask`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
    if (data) return data;
    return {
      id: Date.now(),
      question,
      answer: `Based on codebase analysis in \`src/auth/middleware.js:5-21\`:\n\n### Findings\nThe requested logic is governed by \`authenticateToken\`. The middleware examines the \`Authorization\` header and validates the JWT against \`ACCESS_TOKEN_SECRET\`.\n\nKey code location:\n- Location: \`src/auth/middleware.js:5-21\``,
      cited_chunks: [
        {
          file_path: 'src/auth/middleware.js',
          line_range: '5-21',
          start_line: 5,
          end_line: 21,
          symbol: 'authenticateToken',
        },
      ],
      created_at: new Date().toISOString(),
    };
  }

  async getQAHistory(id) {
    const data = await this._fetch(`/repos/${id}/qa/history`);
    return data || MOCK_QA_SESSIONS;
  }

  // --- Bug Analysis ---
  async analyzeBugs(id, filePath = null) {
    const data = await this._fetch(`/repos/${id}/analyze-bugs`, {
      method: 'POST',
      body: JSON.stringify({ file_path: filePath }),
    });
    if (data) return data.findings;
    return MOCK_BUGS;
  }

  async getBugs(id, filePath = null) {
    const query = filePath ? `?file_path=${encodeURIComponent(filePath)}` : '';
    const data = await this._fetch(`/repos/${id}/bugs${query}`);
    return data || MOCK_BUGS;
  }

  // --- Dependencies ---
  async getDependencies(id) {
    const data = await this._fetch(`/repos/${id}/dependencies`);
    return data || MOCK_DEPENDENCIES;
  }

  // --- Commits & PRs ---
  async getCommits(id) {
    const data = await this._fetch(`/repos/${id}/commits`);
    return data || MOCK_COMMITS;
  }

  async getPullRequests(id) {
    const data = await this._fetch(`/repos/${id}/prs`);
    return (
      data || [
        {
          number: 1,
          title: 'feat: enhance authentication error handling & token refresh',
          author: 'dev-contributor',
          state: 'open',
          created_at: '2026-03-24T14:20:00Z',
        },
      ]
    );
  }

  async reviewPullRequest(id, prNumber) {
    const data = await this._fetch(`/repos/${id}/pr/${prNumber}/review`, {
      method: 'POST',
    });
    return data || MOCK_PR;
  }

  async postPRComment(id, prNumber, comment) {
    const data = await this._fetch(`/repos/${id}/pr/${prNumber}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
    return data || { success: true, message: 'Simulated comment posted.' };
  }

  async resyncRepo(id) {
    const data = await this._fetch(`/repos/${id}/resync`, {
      method: 'POST',
    });
    return data || { message: 'Resync triggered.' };
  }
}

export const api = new ApiClient();
