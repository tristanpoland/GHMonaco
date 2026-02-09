import * as monaco from 'monaco-editor';

export const GITHUB_DARK_THEME_NAME = 'github-dark';

export function registerGitHubDarkTheme(): void {
  monaco.editor.defineTheme(GITHUB_DARK_THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      // Comments
      { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      { token: 'comment.block', foreground: '8b949e', fontStyle: 'italic' },
      { token: 'comment.line', foreground: '8b949e', fontStyle: 'italic' },

      // Keywords & control flow
      { token: 'keyword', foreground: 'ff7b72' },
      { token: 'keyword.control', foreground: 'ff7b72' },
      { token: 'keyword.operator', foreground: 'ff7b72' },
      { token: 'storage', foreground: 'ff7b72' },
      { token: 'storage.type', foreground: 'ff7b72' },

      // Strings
      { token: 'string', foreground: 'a5d6ff' },
      { token: 'string.escape', foreground: '79c0ff' },
      { token: 'string.regexp', foreground: '7ee787' },

      // Numbers & constants
      { token: 'number', foreground: '79c0ff' },
      { token: 'constant', foreground: '79c0ff' },
      { token: 'constant.language', foreground: '79c0ff' },
      { token: 'constant.numeric', foreground: '79c0ff' },

      // Functions
      { token: 'entity.name.function', foreground: 'd2a8ff' },
      { token: 'support.function', foreground: 'd2a8ff' },
      { token: 'meta.function-call', foreground: 'd2a8ff' },

      // Types & classes
      { token: 'entity.name.type', foreground: 'ffa657' },
      { token: 'entity.name.class', foreground: 'ffa657' },
      { token: 'support.type', foreground: 'ffa657' },
      { token: 'support.class', foreground: 'ffa657' },
      { token: 'type', foreground: 'ffa657' },

      // Variables & parameters
      { token: 'variable', foreground: 'ffa657' },
      { token: 'variable.parameter', foreground: 'e6edf3' },
      { token: 'variable.other', foreground: 'e6edf3' },

      // Operators & punctuation
      { token: 'keyword.operator.assignment', foreground: 'ff7b72' },
      { token: 'punctuation', foreground: 'e6edf3' },
      { token: 'delimiter', foreground: 'e6edf3' },
      { token: 'delimiter.bracket', foreground: 'e6edf3' },

      // Tags (HTML/XML)
      { token: 'tag', foreground: '7ee787' },
      { token: 'metatag', foreground: 'e6edf3' },
      { token: 'tag.attribute.name', foreground: '79c0ff' },

      // CSS
      { token: 'attribute.name', foreground: '79c0ff' },
      { token: 'attribute.value', foreground: 'a5d6ff' },

      // Markdown
      { token: 'markup.heading', foreground: '79c0ff', fontStyle: 'bold' },
      { token: 'markup.bold', fontStyle: 'bold' },
      { token: 'markup.italic', fontStyle: 'italic' },
      { token: 'markup.inline.raw', foreground: 'a5d6ff' },

      // Default text
      { token: '', foreground: 'e6edf3' },
      { token: 'identifier', foreground: 'e6edf3' },
    ],
    colors: {
      // Editor
      'editor.background': '#0d1117',
      'editor.foreground': '#e6edf3',
      'editor.lineHighlightBackground': '#161b22',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#1c3a5c',

      // Cursor
      'editorCursor.foreground': '#58a6ff',

      // Line numbers
      'editorLineNumber.foreground': '#484f58',
      'editorLineNumber.activeForeground': '#e6edf3',

      // Gutter
      'editorGutter.background': '#0d1117',

      // Indent guides
      'editorIndentGuide.background': '#21262d',
      'editorIndentGuide.activeBackground': '#30363d',

      // Brackets
      'editorBracketMatch.background': '#17191e',
      'editorBracketMatch.border': '#58a6ff',

      // Whitespace
      'editorWhitespace.foreground': '#21262d',

      // Scrollbar
      'scrollbarSlider.background': '#484f5833',
      'scrollbarSlider.hoverBackground': '#484f5866',
      'scrollbarSlider.activeBackground': '#484f5899',

      // Minimap
      'minimap.background': '#0d1117',

      // Widget (autocomplete, hover)
      'editorWidget.background': '#161b22',
      'editorWidget.border': '#30363d',
      'editorSuggestWidget.background': '#161b22',
      'editorSuggestWidget.border': '#30363d',
      'editorSuggestWidget.selectedBackground': '#1f6feb33',
      'editorHoverWidget.background': '#161b22',
      'editorHoverWidget.border': '#30363d',

      // Overview ruler
      'editorOverviewRuler.border': '#21262d',

      // Input
      'input.background': '#0d1117',
      'input.border': '#30363d',
      'input.foreground': '#e6edf3',

      // Focus border
      'focusBorder': '#1f6feb',

      // List
      'list.activeSelectionBackground': '#1f6feb33',
      'list.hoverBackground': '#161b22',
    },
  });
}
