// Service worker for proxying GitHub API requests
// Content scripts are subject to CORS, but service workers are not.

interface ApiRequest {
  url: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('GHmonaco extension installed');
});

// Handle messages from content script to proxy API requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'API_REQUEST') {
    const apiRequest = request as ApiRequest & { type: string };
    
    // Make the API request from the service worker (no CORS restrictions)
    fetch(apiRequest.url, {
      method: apiRequest.method,
      headers: apiRequest.headers,
      body: apiRequest.body,
      credentials: 'include', // Send cookies
    })
      .then(async (response) => {
        const text = await response.text();
        sendResponse({
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          body: text,
        });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          status: 0,
          statusText: error.message,
          body: null,
        });
      });
    
    // Return true to indicate async response
    return true;
  }
});
