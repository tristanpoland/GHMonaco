// Set webpack public path so async chunks load from the extension URL
declare var __webpack_public_path__: string;
__webpack_public_path__ = chrome.runtime.getURL('/');

import * as monaco from 'monaco-editor';
import './styles.css';

import { registerGitHubDarkTheme } from './github-dark-theme';
import { detectGitHubEditor, observeFilenameChanges } from './editor-detector';
import { injectMonacoEditor, updateLanguage, disposeMonacoEditor } from './monaco-injector';

// Configure Monaco workers to load via fetch and create blob URLs
// This is needed because content scripts can't load workers directly from chrome-extension://
(self as any).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string): Worker {
    // Fetch the worker script from the extension
    const getWorkerUrl = (workerName: string): string => {
      return chrome.runtime.getURL(`${workerName}.worker.js`);
    };

    let workerUrl: string;
    switch (label) {
      case 'json':
        workerUrl = getWorkerUrl('json');
        break;
      case 'css':
      case 'scss':
      case 'less':
        workerUrl = getWorkerUrl('css');
        break;
      case 'html':
      case 'handlebars':
      case 'razor':
        workerUrl = getWorkerUrl('html');
        break;
      case 'typescript':
      case 'javascript':
        workerUrl = getWorkerUrl('ts');
        break;
      default:
        workerUrl = getWorkerUrl('editor');
    }

    // Fetch and create blob URL to bypass cross-origin restrictions
    return new Worker(workerUrl);
  },
};

// Register theme before any editor creation
registerGitHubDarkTheme();

let initialized = false;
let filenameObserver: MutationObserver | null = null;

/**
 * Attempts to detect and replace GitHub's editor with Monaco.
 */
async function tryInjectEditor(): Promise<void> {
  if (initialized) return;

  const elements = detectGitHubEditor();
  if (!elements) return;

  console.log('[GHmonaco] Editor detected, injecting Monaco...');
  const editor = await injectMonacoEditor(elements);

  if (editor) {
    initialized = true;
    console.log('[GHmonaco] Monaco editor injected successfully');

    // Watch for filename changes to update language
    filenameObserver = observeFilenameChanges((filename) => {
      console.log('[GHmonaco] Filename changed:', filename);
      updateLanguage(filename);
    });
  }
}

/**
 * Cleans up on SPA navigation away from edit page.
 */
function cleanup(): void {
  if (!initialized) return;

  disposeMonacoEditor();
  filenameObserver?.disconnect();
  filenameObserver = null;
  initialized = false;
  console.log('[GHmonaco] Cleaned up');
}

// Initial attempt
tryInjectEditor();

// MutationObserver for GitHub's Turbo/SPA navigation
const pageObserver = new MutationObserver((mutations) => {
  // Check if we navigated away from an edit page
  const isEditPage =
    /\/(edit|new|upload)\//.test(window.location.pathname) ||
    window.location.pathname.endsWith('/new');

  if (!isEditPage && initialized) {
    cleanup();
    return;
  }

  // Check if new editor elements appeared
  if (isEditPage && !initialized) {
    // Only try to inject if we see relevant DOM changes
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        tryInjectEditor();
        break;
      }
    }
  }
});

pageObserver.observe(document.body, {
  childList: true,
  subtree: true,
});

// Also listen for Turbo navigation events
document.addEventListener('turbo:load', () => {
  const isEditPage =
    /\/(edit|new|upload)\//.test(window.location.pathname) ||
    window.location.pathname.endsWith('/new');

  if (isEditPage && !initialized) {
    tryInjectEditor();
  } else if (!isEditPage && initialized) {
    cleanup();
  }
});

// GitHub also uses popstate for navigation
window.addEventListener('popstate', () => {
  setTimeout(() => {
    const isEditPage =
      /\/(edit|new|upload)\//.test(window.location.pathname) ||
      window.location.pathname.endsWith('/new');

    if (isEditPage && !initialized) {
      tryInjectEditor();
    } else if (!isEditPage && initialized) {
      cleanup();
    }
  }, 100);
});
