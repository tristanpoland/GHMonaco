export interface GitHubEditorElements {
  /** The container that holds the editor area */
  container: HTMLElement;
  /** The textarea or CodeMirror element that holds the code */
  textarea: HTMLTextAreaElement | null;
  /** The CodeMirror editor element (if present) */
  codeMirror: HTMLElement | null;
  /** The current filename from the UI */
  filename: string;
}

/** Selectors for GitHub's code editing elements */
const EDITOR_SELECTORS = {
  // CodeMirror 6 editor (newer GitHub)
  codeMirror: '.cm-editor',
  // Textarea-based editor (fallback / older GitHub)
  textarea: '.file-editor-textarea, #code-editor textarea, textarea[name="value"]',
  // Editor container selectors
  container: [
    '[data-testid="code-editor"]',
    '.CodeMirror',
    '.cm-editor',
    '.file-editor-textarea',
    '#code-editor',
    '.js-code-editor',
    '.react-code-editor',
  ].join(', '),
  // Filename input
  filenameInput: [
    '.js-blob-filename',
    '[data-testid="file-name-editor"] input',
    'input[aria-label="File name"]',
    '.react-blob-header-edit-file-name input',
    'input.js-blob-filename',
  ].join(', '),
};

/**
 * Detects whether we're on a GitHub edit page and finds the editor elements.
 * Returns null if no editor is found.
 */
export function detectGitHubEditor(): GitHubEditorElements | null {
  // Check if we're on an edit-like page
  const isEditPage =
    /\/(edit|new|upload)\//.test(window.location.pathname) ||
    window.location.pathname.endsWith('/new') ||
    document.querySelector('.js-blob-form') !== null ||
    document.querySelector('[data-testid="code-editor"]') !== null;

  if (!isEditPage) return null;

  // Find editor container
  const container = document.querySelector<HTMLElement>(EDITOR_SELECTORS.container);
  if (!container) return null;

  // Find textarea (important for syncing to enable commit button)
  const textarea = document.querySelector<HTMLTextAreaElement>(EDITOR_SELECTORS.textarea);

  // Find CodeMirror
  const codeMirror = document.querySelector<HTMLElement>(EDITOR_SELECTORS.codeMirror);

  // Get filename
  const filename = getFilename();

  return { container, textarea, codeMirror, filename };
}

/** Gets the current filename from the GitHub UI */
export function getFilename(): string {
  const filenameInput = document.querySelector<HTMLInputElement>(
    EDITOR_SELECTORS.filenameInput.split(', ').join(', ')
  );
  if (filenameInput) return filenameInput.value || '';

  // Fallback: try to get from breadcrumb / URL
  const pathParts = window.location.pathname.split('/');
  const editIndex = pathParts.indexOf('edit');
  if (editIndex !== -1 && editIndex < pathParts.length - 1) {
    // Everything after branch name is the file path
    // /owner/repo/edit/branch/path/to/file.ext
    return pathParts.slice(editIndex + 2).join('/');
  }

  return '';
}

/**
 * Observes the filename input for changes and calls the callback.
 */
export function observeFilenameChanges(callback: (filename: string) => void): MutationObserver | null {
  const filenameInput = document.querySelector<HTMLInputElement>(
    EDITOR_SELECTORS.filenameInput.split(', ').join(', ')
  );
  if (!filenameInput) return null;

  filenameInput.addEventListener('input', () => {
    callback(filenameInput.value);
  });

  // Also observe for attribute changes on the input
  const observer = new MutationObserver(() => {
    callback(filenameInput.value);
  });

  observer.observe(filenameInput, { attributes: true, attributeFilter: ['value'] });
  return observer;
}
