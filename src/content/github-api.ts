/**
 * GitHub API client for making authenticated requests.
 * Uses GitHub's public API with token auth (no CORS issues).
 */

interface FileInfo {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

interface CommitOptions {
  message: string;
  content: string;
  sha?: string; // Required for updates
}

/**
 * Parse repository info from current GitHub URL.
 */
export function parseRepoInfo(): FileInfo | null {
  const match = window.location.pathname.match(
    /^\/([^\/]+)\/([^\/]+)\/(?:edit|new)\/([^\/]+)(?:\/(.+))?$/
  );
  
  if (!match) return null;
  
  return {
    owner: match[1],
    repo: match[2],
    branch: match[3],
    path: match[4] || '',
  };
}

/**
 * Extract GitHub API token from the page.
 * GitHub uses tokens in localStorage and session storage.
 */
async function getGitHubToken(): Promise<string | null> {
  // Try to get token from GitHub's session storage
  try {
    // GitHub stores session data in various places
    const keys = Object.keys(sessionStorage);
    for (const key of keys) {
      if (key.includes('token') || key.includes('auth')) {
        const value = sessionStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (parsed.token) return parsed.token;
          } catch {
            // Not JSON, might be raw token
            if (value.startsWith('gho_') || value.startsWith('ghp_')) {
              return value;
            }
          }
        }
      }
    }

    // Try localStorage
    const localKeys = Object.keys(localStorage);
    for (const key of localKeys) {
      if (key.includes('token') || key.includes('auth')) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (parsed.token) return parsed.token;
          } catch {
            if (value.startsWith('gho_') || value.startsWith('ghp_')) {
              return value;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[GHmonaco] Error getting token:', err);
  }

  return null;
}

/**
 * Make an authenticated fetch request to GitHub API without credentials.
 * Uses Authorization header instead to avoid CORS issues.
 */
async function githubApiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getGitHubToken();
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    ...options.headers as Record<string, string>,
  };

  // Add auth header if we have a token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
    // Don't send credentials - this avoids CORS wildcard issue
  });
}

/**
 * Get the current file's SHA (required for updating existing files).
 */
async function getFileSha(info: FileInfo): Promise<string | null> {
  const url = `https://api.github.com/repos/${info.owner}/${info.repo}/contents/${info.path}?ref=${info.branch}`;
  
  try {
    const response = await githubApiFetch(url);

    if (!response.ok) return null;
    
    const data = await response.json();
    return data.sha || null;
  } catch (err) {
    console.error('[GHmonaco] Failed to get file SHA:', err);
    return null;
  }
}

/**
 * Commit changes to GitHub via the Contents API.
 */
export async function commitFile(
  info: FileInfo,
  options: CommitOptions
): Promise<{ success: boolean; error?: string }> {
  // For updates, we need the file's current SHA
  let sha = options.sha;
  if (!sha && info.path) {
    sha = (await getFileSha(info)) || undefined;
  }

  const url = `https://api.github.com/repos/${info.owner}/${info.repo}/contents/${info.path}`;
  
  // Encode content as base64
  const base64Content = btoa(unescape(encodeURIComponent(options.content)));

  const body: any = {
    message: options.message,
    content: base64Content,
    branch: info.branch,
  };

  if (sha) {
    body.sha = sha;
  }

  try {
    const response = await githubApiFetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[GHmonaco] Commit failed:', error);
      return { success: false, error: `HTTP ${response.status}: ${error}` };
    }

    const result = await response.json();
    console.log('[GHmonaco] Commit successful:', result);
    return { success: true };
  } catch (err) {
    console.error('[GHmonaco] Commit error:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Get file content from GitHub API.
 */
export async function getFileContent(info: FileInfo): Promise<string | null> {
  const url = `https://api.github.com/repos/${info.owner}/${info.repo}/contents/${info.path}?ref=${info.branch}`;
  
  try {
    const response = await githubApiFetch(url);

    if (!response.ok) {
      console.error('[GHmonaco] Failed to fetch file:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    // Decode base64 content
    if (data.content) {
      return decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
    }
    
    return null;
  } catch (err) {
    console.error('[GHmonaco] Error fetching file:', err);
    return null;
  }
}
