import * as monaco from 'monaco-editor';
import { GitHubEditorElements } from './editor-detector';
import { detectLanguage } from './language-detector';
import { GITHUB_DARK_THEME_NAME } from './github-dark-theme';
import { setupContentSync } from './content-sync';

const MONACO_CONTAINER_ID = 'ghmonace-editor-container';

let currentEditor: monaco.editor.IStandaloneCodeEditor | null = null;
let currentDisposables: monaco.IDisposable[] = [];

/**
 * Creates and injects a Monaco editor instance, hiding the original GitHub editor.
 */
export function injectMonacoEditor(elements: GitHubEditorElements): monaco.editor.IStandaloneCodeEditor | null {
  // Don't double-inject
  if (document.getElementById(MONACO_CONTAINER_ID)) {
    return currentEditor;
  }

  const { container, textarea, codeMirror, filename } = elements;

  // Get initial content
  let initialContent = '';
  if (textarea) {
    initialContent = textarea.value;
  } else if (codeMirror) {
    const cmContent = codeMirror.querySelector('.cm-content');
    if (cmContent) {
      initialContent = cmContent.textContent || '';
    }
  }

  // Detect language from filename
  const language = detectLanguage(filename);

  // Create Monaco container
  const monacoContainer = document.createElement('div');
  monacoContainer.id = MONACO_CONTAINER_ID;
  monacoContainer.className = 'ghmonace-container';

  // Insert Monaco container before the original editor
  container.parentElement?.insertBefore(monacoContainer, container);

  // Hide the original editor
  container.style.display = 'none';

  // Also hide CodeMirror if it's a separate element
  if (codeMirror && codeMirror !== container) {
    codeMirror.style.display = 'none';
  }

  // Create Monaco editor
  const editor = monaco.editor.create(monacoContainer, {
    value: initialContent,
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
  });

  currentEditor = editor;

  // Set up textarea sync
  if (textarea) {
    const syncDisposable = setupContentSync(editor, textarea);
    currentDisposables.push(syncDisposable);
  }

  // Set up resize observer to adapt height
  const resizeObserver = new ResizeObserver(() => {
    const lineCount = editor.getModel()?.getLineCount() || 20;
    const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
    const padding = 32; // top + bottom padding
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

  const monacoContainer = document.getElementById(MONACO_CONTAINER_ID);
  if (monacoContainer) {
    // Restore original editor visibility
    const nextSibling = monacoContainer.nextElementSibling as HTMLElement | null;
    if (nextSibling) {
      nextSibling.style.display = '';
    }
    monacoContainer.remove();
  }
}
