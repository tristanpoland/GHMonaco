/**
 * Hijacks GitHub's native commit button to use our API-based commit flow.
 */

import { parseRepoInfo, commitFile } from './github-api';

/**
 * Find and replace GitHub's commit button with our own handler.
 */
export function hijackCommitButton(getEditorContent: () => string): void {
  // GitHub's commit button selectors
  // GitHub's commit button selectors
  const buttonSelectors = [
    'button[data-variant="primary"]', // New GitHub design
    'button[name="commit-action"]',
    'button[data-testid="commit-changes-button"]',
    '.js-blob-submit',
  ];

  const findCommitButton = (): HTMLButtonElement | null => {
    // Try each selector and check the text
    for (const selector of buttonSelectors) {
      try {
        const buttons = document.querySelectorAll<HTMLButtonElement>(selector);
        for (const button of buttons) {
          const text = button.textContent?.toLowerCase() || '';
          // Must have "commit" in text and NOT be feedback button
          if (text.includes('commit') && !text.includes('feedback')) {
            console.log('[GHmonaco] Found button with selector:', selector, button);
            return button;
          }
        }
      } catch (e) {
        // Skip invalid selectors
      }
    }
    
    console.log('[GHmonaco] No commit button found');
    return null;
  };

  const interceptCommit = async (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const repoInfo = parseRepoInfo();
    if (!repoInfo) {
      alert('Error: Could not parse repository info');
      return;
    }

    // Get commit message from GitHub's form
    const commitMessageInput = document.querySelector<HTMLInputElement>(
      'input[name="commit-summary"], input[aria-label*="commit message" i], #commit-summary-input'
    );
    
    const commitDescriptionTextarea = document.querySelector<HTMLTextAreaElement>(
      'textarea[name="commit-description"], textarea[aria-label*="extended description" i], #commit-description-textarea'
    );

    let message = commitMessageInput?.value || 'Update file';
    if (commitDescriptionTextarea?.value) {
      message += '\n\n' + commitDescriptionTextarea.value;
    }

    // Show loading state
    const button = event.target as HTMLButtonElement;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Committing...';

    // Commit via our API
    const content = getEditorContent();
    const result = await commitFile(repoInfo, {
      message,
      content,
    });

    if (result.success) {
      // Success - redirect to file view
      const viewUrl = `/${repoInfo.owner}/${repoInfo.repo}/blob/${repoInfo.branch}/${repoInfo.path}`;
      window.location.href = viewUrl;
    } else {
      // Error - show message and restore button
      alert(`Commit failed: ${result.error || 'Unknown error'}`);
      button.disabled = false;
      button.textContent = originalText;
    }
  };

  // Find and hijack the button
  const findAndHijack = () => {
    const button = findCommitButton();
    if (!button) {
      console.log('[GHmonaco] Commit button not found yet');
      return false;
    }

    // Check if already hijacked
    if (button.dataset.ghmonacoHijacked) {
      return true;
    }
    
    button.dataset.ghmonacoHijacked = 'true';
    console.log('[GHmonaco] Hijacking commit button:', button);

    // Remove all existing click handlers by cloning
    const newButton = button.cloneNode(true) as HTMLButtonElement;
    button.parentNode?.replaceChild(newButton, button);

    // Add our handler with capture phase to intercept first
    newButton.addEventListener('click', interceptCommit, { capture: true });

    // Also intercept form submission
    const form = newButton.closest('form');
    if (form && !form.dataset.ghmonacoHijacked) {
      form.dataset.ghmonacoHijacked = 'true';
      form.addEventListener('submit', interceptCommit, { capture: true });
      console.log('[GHmonaco] Hijacked form submission');
    }
    
    return true;
  };

  // Try immediately and repeatedly until found
  let attempts = 0;
  const maxAttempts = 50;
  
  const tryFind = () => {
    attempts++;
    if (findAndHijack()) {
      console.log('[GHmonaco] Successfully hijacked commit button');
      return;
    }
    
    if (attempts < maxAttempts) {
      setTimeout(tryFind, 200);
    } else {
      console.warn('[GHmonaco] Could not find commit button after', maxAttempts, 'attempts');
    }
  };
  
  tryFind();

  // Also watch for button appearing dynamically
  const observer = new MutationObserver(() => {
    if (!document.querySelector('[data-ghmonaco-hijacked="true"]')) {
      findAndHijack();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Clean up after 30 seconds
  setTimeout(() => observer.disconnect(), 30000);
}
