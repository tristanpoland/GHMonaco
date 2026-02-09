const EXTENSION_MAP: Record<string, string> = {
  // JavaScript / TypeScript
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',

  // Web
  html: 'html',
  htm: 'html',
  xhtml: 'html',
  vue: 'html',
  svelte: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',

  // Data / Config
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'ini',
  ini: 'ini',
  xml: 'xml',
  svg: 'xml',

  // Scripting
  py: 'python',
  pyw: 'python',
  rb: 'ruby',
  rake: 'ruby',
  gemspec: 'ruby',
  pl: 'perl',
  pm: 'perl',
  lua: 'lua',
  php: 'php',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
  ps1: 'powershell',
  psm1: 'powershell',
  bat: 'bat',
  cmd: 'bat',

  // Systems
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cxx: 'cpp',
  cc: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  cs: 'csharp',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  go: 'go',
  rs: 'rust',
  swift: 'swift',
  m: 'objective-c',
  mm: 'objective-c',
  scala: 'scala',
  dart: 'dart',
  r: 'r',
  R: 'r',

  // Functional
  hs: 'haskell',
  ex: 'elixir',
  exs: 'elixir',
  erl: 'erlang',
  clj: 'clojure',
  cljs: 'clojure',
  fs: 'fsharp',
  fsx: 'fsharp',

  // Markup / Docs
  md: 'markdown',
  mdx: 'markdown',
  markdown: 'markdown',
  rst: 'restructuredtext',
  tex: 'latex',
  latex: 'latex',

  // Database
  sql: 'sql',
  mysql: 'sql',
  pgsql: 'sql',

  // DevOps / Config
  dockerfile: 'dockerfile',
  tf: 'hcl',
  hcl: 'hcl',
  graphql: 'graphql',
  gql: 'graphql',
  proto: 'protobuf',

  // Other
  diff: 'diff',
  patch: 'diff',
  csv: 'plaintext',
  txt: 'plaintext',
  log: 'plaintext',
};

const FILENAME_MAP: Record<string, string> = {
  Dockerfile: 'dockerfile',
  'Dockerfile.dev': 'dockerfile',
  'Dockerfile.prod': 'dockerfile',
  Makefile: 'makefile',
  GNUmakefile: 'makefile',
  Rakefile: 'ruby',
  Gemfile: 'ruby',
  Vagrantfile: 'ruby',
  Brewfile: 'ruby',
  Jenkinsfile: 'groovy',
  Cakefile: 'coffeescript',
  '.gitignore': 'ini',
  '.gitattributes': 'ini',
  '.editorconfig': 'ini',
  '.env': 'shell',
  '.env.local': 'shell',
  '.env.development': 'shell',
  '.env.production': 'shell',
  '.babelrc': 'json',
  '.eslintrc': 'json',
  '.prettierrc': 'json',
  'tsconfig.json': 'json',
  'package.json': 'json',
  'package-lock.json': 'json',
  'composer.json': 'json',
  'Cargo.toml': 'ini',
  'Cargo.lock': 'ini',
  'go.mod': 'go',
  'go.sum': 'plaintext',
};

export function detectLanguage(filename: string): string {
  if (!filename) return 'plaintext';

  // Check exact filename match first
  const filenameMatch = FILENAME_MAP[filename];
  if (filenameMatch) return filenameMatch;

  // Check basename (without path)
  const basename = filename.split('/').pop() || filename;
  const basenameMatch = FILENAME_MAP[basename];
  if (basenameMatch) return basenameMatch;

  // Check for Dockerfile variants
  if (basename.startsWith('Dockerfile')) return 'dockerfile';

  // Check extension
  const dotIndex = basename.lastIndexOf('.');
  if (dotIndex !== -1) {
    const ext = basename.slice(dotIndex + 1).toLowerCase();
    return EXTENSION_MAP[ext] || 'plaintext';
  }

  return 'plaintext';
}
