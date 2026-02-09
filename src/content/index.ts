import * as monaco from 'monaco-editor';
import './styles.css';

import { registerGitHubDarkTheme } from './github-dark-theme';
import { detectGitHubEditor, observeFilenameChanges } from './editor-detector';
import { injectMonacoEditor, updateLanguage, disposeMonacoEditor } from './monaco-injector';

// Configure Monaco workers to use chrome.runtime.getURL for MV3 CSP compliance
(self as any).MonacoEnvironment = {
  getWorkerUrl(_moduleId: string, label: string): string {
    switch (label) {
      case 'json':
        return chrome.runtime.getURL('json.worker.js');
      case 'css':
      case 'scss':
      case 'less':
        return chrome.runtime.getURL('css.worker.js');
      case 'html':
      case 'handlebars':
      case 'razor':
        return chrome.runtime.getURL('html.worker.js');
      case 'typescript':
      case 'javascript':
        return chrome.runtime.getURL('ts.worker.js');
      default:
        return chrome.runtime.getURL('editor.worker.js');
    }
  },
};

// Register theme before any editor creation
registerGitHubDarkTheme();

let initialized = false;
let filenameObserver: MutationObserver | null = null;

/**
 * Attempts to detect and replace GitHub's editor with Monaco.
 */
function tryInjectEditor(): void {
  if (initialized) return;

  const elements = detectGitHubEditor();
  if (!elements) return;

  console.log('[GHMonace] Editor detected, injecting Monaco...');
  const editor = injectMonacoEditor(elements);

  if (editor) {
    initialized = true;
    console.log('[GHMonace] Monaco editor injected successfully');

    // Watch for filename changes to update language
    filenameObserver = observeFilenameChanges((filename) => {
      console.log('[GHMonace] Filename changed:', filename);
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
  console.log('[GHMonace] Cleaned up');
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
