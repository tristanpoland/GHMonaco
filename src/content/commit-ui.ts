import * as monaco from 'monaco-editor';
import { parseRepoInfo, commitFile } from './github-api';

/**
 * Creates a commit button/action in Monaco editor.
 */
export function addCommitButton(editor: monaco.editor.IStandaloneCodeEditor): monaco.IDisposable {
  // Add keyboard shortcut: Ctrl+S / Cmd+S
  const actionDisposable = editor.addAction({
    id: 'ghmonaco.commit',
    label: 'Commit Changes',
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
    ],
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1.5,
    run: async (ed) => {
      const content = ed.getValue();
      const info = parseRepoInfo();

      if (!info) {
        showNotification('Error: Could not parse repository info', 'error');
        return;
      }

      // Show commit message prompt
      const message = await promptCommitMessage();
      if (!message) {
        return; // User cancelled
      }

      // Show loading state
      showNotification('Committing changes...', 'info');

      // Commit via API
      const result = await commitFile(info, {
        message,
        content,
      });

      if (result.success) {
        showNotification('✓ Changes committed successfully', 'success');
        
        // Optionally redirect to the file view
        setTimeout(() => {
          const viewUrl = `/${info.owner}/${info.repo}/blob/${info.branch}/${info.path}`;
          window.location.href = viewUrl;
        }, 1000);
      } else {
        showNotification(`✗ Commit failed: ${result.error || 'Unknown error'}`, 'error');
      }
    },
  });

  return actionDisposable;
}

/**
 * Show a simple notification toast.
 */
function showNotification(message: string, type: 'info' | 'success' | 'error'): void {
  const toast = document.createElement('div');
  toast.className = `ghmonaco-toast ghmonaco-toast-${type}`;
  toast.textContent = message;
  
  // Add to page
  document.body.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('ghmonaco-toast-fadeout');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Prompt user for commit message using native prompt (temporary).
 * TODO: Replace with a nicer modal UI.
 */
async function promptCommitMessage(): Promise<string | null> {
  const message = window.prompt('Enter commit message:');
  return message?.trim() || null;
}
