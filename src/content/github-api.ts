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
 * Extract auth from GitHub's own requests.
 * We intercept GitHub's actual fetch requests to see what auth they use.
 */
let cachedAuthHeaders: Record<string, string> | null = null;

function interceptGitHubFetch() {
  if (cachedAuthHeaders) return; // Already intercepted

  const originalFetch = window.fetch;
  window.fetch = async function(...args: any[]) {
    const [url, options] = args;
    const response = await originalFetch.apply(this, args);
    
    // Check if this is a GitHub API request
    if (typeof url === 'string' && url.includes('api.github.com')) {
      const headers = options?.headers;
      if (headers) {
        // Extract Authorization header if present
        const authHeaders: Record<string, string> = {};
        if (headers instanceof Headers) {
          const auth = headers.get('Authorization');
          if (auth) authHeaders['Authorization'] = auth;
        } else if (typeof headers === 'object') {
          if ('Authorization' in headers) {
            authHeaders['Authorization'] = (headers as any).Authorization;
          }
        }
        if (Object.keys(authHeaders).length > 0) {
          cachedAuthHeaders = authHeaders;
          console.log('[GHmonaco] Captured auth from GitHub request');
        }
      }
    }
    
    return response;
  };
}

/**
 * Make an authenticated fetch request using same auth as GitHub.
 * We use cookie-based auth (same as GitHub's own requests) which works because
 * we're making requests from the same origin context.
 */
async function githubApiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Install fetch interceptor to learn GitHub's auth
  interceptGitHubFetch();
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    ...options.headers as Record<string, string>,
  };

  // Use captured auth headers if available
  if (cachedAuthHeaders) {
    Object.assign(headers, cachedAuthHeaders);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Send cookies - we're authenticated via session
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
