import * as monaco from 'monaco-editor';
import { GitHubEditorElements } from './editor-detector';
import { detectLanguage } from './language-detector';
import { GITHUB_DARK_THEME_NAME } from './github-dark-theme';
import { addCommitButton } from './commit-ui';
import { parseRepoInfo, getFileContent } from './github-api';
import { hijackCommitButton } from './commit-hijack';

const MONACO_CONTAINER_ID = 'ghmonaco-editor-container';
const HIDDEN_ATTR = 'data-ghmonaco-hidden';

let currentEditor: monaco.editor.IStandaloneCodeEditor | null = null;
let currentDisposables: monaco.IDisposable[] = [];

/**
 * Hide an element and tag it so we can restore later.
 */
function hideElement(el: HTMLElement): void {
  el.setAttribute(HIDDEN_ATTR, el.style.display);
  el.style.display = 'none';
}

/**
 * Creates and injects a Monaco editor instance, hiding the original GitHub editor.
 * Loads content directly from GitHub API.
 */
export async function injectMonacoEditor(
  elements: GitHubEditorElements
): Promise<monaco.editor.IStandaloneCodeEditor | null> {
  // Don't double-inject
  if (document.getElementById(MONACO_CONTAINER_ID)) {
    return currentEditor;
  }

  const { container, filename } = elements;

  console.log('[GHmonaco] Injecting editor for:', filename);

  // Parse repo info from URL
  const repoInfo = parseRepoInfo();
  if (!repoInfo) {
    console.error('[GHmonaco] Could not parse repository info from URL');
    return null;
  }

  // Detect language from filename
  const language = detectLanguage(filename);

  // Create Monaco container
  const monacoContainer = document.createElement('div');
  monacoContainer.id = MONACO_CONTAINER_ID;
  monacoContainer.className = 'ghmonaco-container';
  monacoContainer.style.display = 'flex';
  monacoContainer.style.flexDirection = 'column';

  // Insert Monaco container to replace the original editor in the layout
  const parent = container.parentElement;
  if (parent) {
    // Make parent a flex container if it isn't already
    const computedStyle = window.getComputedStyle(parent);
    if (computedStyle.display !== 'flex') {
      parent.style.display = 'flex';
      parent.style.flexDirection = 'column';
      parent.style.flex = '1';
    }
    parent.insertBefore(monacoContainer, container);
  }

  // Hide the original editor completely - use display:none and visibility:hidden
  container.style.display = 'none';
  container.style.visibility = 'hidden';
  container.style.height = '0';
  container.style.overflow = 'hidden';
  container.setAttribute('aria-hidden', 'true');
  
  // Hide all parent wrappers that contain the editor
  const wrappers = [
    container.closest<HTMLElement>('[data-testid="code-editor"]'),
    container.closest<HTMLElement>('.react-code-editor'),
    container.closest<HTMLElement>('.js-code-editor'),
    container.closest<HTMLElement>('.CodeMirror-wrap'),
    container.closest<HTMLElement>('.cm-editor'),
  ];
  
  for (const wrapper of wrappers) {
    if (wrapper && wrapper !== container) {
      wrapper.style.display = 'none';
      wrapper.style.visibility = 'hidden';
      wrapper.style.height = '0';
      wrapper.style.overflow = 'hidden';
      wrapper.setAttribute('aria-hidden', 'true');
    }
  }

  // Create Monaco editor with loading state
  const editor = monaco.editor.create(monacoContainer, {
    value: '// Loading file from GitHub API...',
    language,
    theme: GITHUB_DARK_THEME_NAME,
    automaticLayout: true,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    padding: { top: 16, bottom: 16 },
    renderLineHighlight: 'line',
    cursorBlinking: 'smooth',
    smoothScrolling: true,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'off',
    folding: true,
    glyphMargin: false,
    lineNumbersMinChars: 4,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    contextmenu: true,
    mouseWheelZoom: true,
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
    readOnly: true, // Make read-only until content loads
  });

  currentEditor = editor;

  // Load content from GitHub API
  const content = await getFileContent(repoInfo);
  if (content !== null) {
    editor.setValue(content);
    editor.updateOptions({ readOnly: false });
    console.log('[GHmonaco] Loaded', content.split('\n').length, 'lines from API');
  } else {
    // New file or API failed - start with empty content
    editor.setValue('');
    editor.updateOptions({ readOnly: false });
    console.log('[GHmonaco] Starting with empty content (new file or API failed)');
  }

  // Add commit button and keyboard shortcut
  const commitActionDisposable = addCommitButton(editor);
  currentDisposables.push(commitActionDisposable);

  // Hijack GitHub's native commit button to use our API
  hijackCommitButton(() => editor.getValue());
  
  // Enable the commit button by simulating input in the hidden textarea
  // This tricks GitHub's JS into thinking the editor has content
  const textarea = elements.textarea;
  if (textarea) {
    // Sync content to textarea so GitHub enables the commit button
    editor.onDidChangeModelContent(() => {
      const content = editor.getValue();
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(textarea, content);
      } else {
        textarea.value = content;
      }

      // Dispatch events to enable commit button
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    // Trigger initial update to enable button
    setTimeout(() => {
      textarea.value = editor.getValue();
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }, 100);
  }

  // Set up resize observer to adapt height
  const resizeObserver = new ResizeObserver(() => {
    const lineCount = editor.getModel()?.getLineCount() || 20;
    const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
    const padding = 32;
    const minHeight = 300;
    const maxHeight = window.innerHeight * 0.8;
    const contentHeight = Math.min(Math.max(lineCount * lineHeight + padding, minHeight), maxHeight);
    monacoContainer.style.height = `${contentHeight}px`;
    editor.layout();
  });

  resizeObserver.observe(monacoContainer);

  // Initial height calculation
  const lineCount = editor.getModel()?.getLineCount() || 20;
  const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
  const padding = 32;
  const minHeight = 300;
  const maxHeight = window.innerHeight * 0.8;
  const contentHeight = Math.min(Math.max(lineCount * lineHeight + padding, minHeight), maxHeight);
  monacoContainer.style.height = `${contentHeight}px`;
  editor.layout();

  // Update height when content changes
  editor.onDidChangeModelContent(() => {
    const newLineCount = editor.getModel()?.getLineCount() || 20;
    const newContentHeight = Math.min(
      Math.max(newLineCount * lineHeight + padding, minHeight),
      maxHeight
    );
    monacoContainer.style.height = `${newContentHeight}px`;
    editor.layout();
  });

  return editor;
}

/**
 * Updates the language of the current Monaco editor based on a new filename.
 */
export function updateLanguage(filename: string): void {
  if (!currentEditor) return;
  const model = currentEditor.getModel();
  if (!model) return;

  const language = detectLanguage(filename);
  monaco.editor.setModelLanguage(model, language);
}

/**
 * Disposes the current Monaco editor and restores the original GitHub editor.
 */
export function disposeMonacoEditor(): void {
  if (currentEditor) {
    currentEditor.dispose();
    currentEditor = null;
  }

  for (const d of currentDisposables) {
    d.dispose();
  }
  currentDisposables = [];

  // Restore all elements we hid
  document.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}]`).forEach((el) => {
    el.style.display = el.getAttribute(HIDDEN_ATTR) || '';
    el.removeAttribute(HIDDEN_ATTR);
  });

  const monacoContainer = document.getElementById(MONACO_CONTAINER_ID);
  if (monacoContainer) {
    monacoContainer.remove();
  }
}
