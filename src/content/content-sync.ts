import * as monaco from 'monaco-editor';

/**
 * Sets up bidirectional sync between Monaco editor and the hidden GitHub textarea.
 * Dispatches native input/change events so GitHub's JS listeners stay in sync
 * (commit button enable, unsaved warning, etc.).
 */
export function setupContentSync(
  editor: monaco.editor.IStandaloneCodeEditor,
  textarea: HTMLTextAreaElement
): monaco.IDisposable {
  let syncing = false;

  const disposable = editor.onDidChangeModelContent(() => {
    if (syncing) return;
    syncing = true;

    try {
      const value = editor.getValue();

      // Set the textarea value using the native setter to ensure React/GitHub picks it up
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(textarea, value);
      } else {
        textarea.value = value;
      }

      // Dispatch native events so GitHub's listeners fire
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    } finally {
      syncing = false;
    }
  });

  return disposable;
}

/**
 * Sets up sync from a CodeMirror editor to Monaco.
 * Observes the CodeMirror content element for changes and updates Monaco accordingly.
 */
export function setupCodeMirrorSync(
  monacoEditor: monaco.editor.IStandaloneCodeEditor,
  cmElement: HTMLElement
): MutationObserver {
  const observer = new MutationObserver(() => {
    const cmContent = cmElement.querySelector('.cm-content');
    if (cmContent) {
      const text = cmContent.textContent || '';
      const currentValue = monacoEditor.getValue();
      if (text !== currentValue) {
        monacoEditor.setValue(text);
      }
    }
  });

  observer.observe(cmElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return observer;
}
