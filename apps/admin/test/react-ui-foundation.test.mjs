import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, '..');
const uiRoot = path.join(adminRoot, 'src', 'react', 'ui');
const stylesRoot = path.join(adminRoot, 'src', 'react', 'styles');

const expectedFiles = [
  'AdminThemeScope.jsx',
  'AdminThemeScope.module.css',
  'Badge.jsx',
  'Badge.module.css',
  'Button.jsx',
  'Button.module.css',
  'Card.jsx',
  'Card.module.css',
  'Field.jsx',
  'Field.module.css',
  'IconAction.jsx',
  'IconAction.module.css',
  'IconButton.jsx',
  'IconButton.module.css',
  'ListSurface.jsx',
  'ListSurface.module.css',
  'StateBlock.jsx',
  'StateBlock.module.css',
  'TableShell.jsx',
  'TableShell.module.css',
  'Tabs.jsx',
  'Tabs.module.css',
  'index.js',
];

const requiredExports = [
  'AdminThemeScope',
  'Badge',
  'Button',
  'Card',
  'IconAction',
  'IconButton',
  'Input',
  'ListPagination',
  'ListSurface',
  'ListSurfaceFooter',
  'ListSurfaceHeader',
  'Select',
  'StateBlock',
  'TableEmpty',
  'TableScroll',
  'TableShell',
  'TableToolbar',
  'Tabs',
];

const requiredTokens = [
  '--admin-react-bg',
  '--admin-react-surface',
  '--admin-react-surface-elevated',
  '--admin-react-surface-muted',
  '--admin-react-border',
  '--admin-react-border-strong',
  '--admin-react-text',
  '--admin-react-text-muted',
  '--admin-react-text-soft',
  '--admin-react-accent',
  '--admin-react-accent-hover',
  '--admin-react-accent-contrast',
  '--admin-react-danger',
  '--admin-react-success',
  '--admin-react-warning',
  '--admin-react-info',
  '--admin-react-focus-ring',
  '--admin-react-radius-sm',
  '--admin-react-radius-md',
  '--admin-react-radius-lg',
  '--admin-react-space-1',
  '--admin-react-space-2',
  '--admin-react-space-3',
  '--admin-react-space-4',
  '--admin-react-space-5',
  '--admin-react-shadow-soft',
  '--admin-react-z-drawer',
  '--admin-react-z-modal',
];

function read(relativePath) {
  return fs.readFileSync(path.join(adminRoot, relativePath), 'utf8');
}

export function runReactUiFoundationTests() {
  for (const file of expectedFiles) {
    assert.equal(fs.existsSync(path.join(uiRoot, file)), true, `${file} should exist`);
  }

  const tokensPath = path.join(stylesRoot, 'adminTokens.css');
  assert.equal(fs.existsSync(tokensPath), true, 'adminTokens.css should exist');

  const indexSource = read(path.join('src', 'react', 'ui', 'index.js'));
  for (const exportName of requiredExports) {
    assert.match(
      indexSource,
      new RegExp(`\\b${exportName}\\b`),
      `${exportName} should be exported`,
    );
  }

  const tokenSource = read(path.join('src', 'react', 'styles', 'adminTokens.css'));
  assert.match(
    tokenSource,
    /\.adminReactTheme\s*\{/,
    'tokens should be scoped to .adminReactTheme',
  );
  assert.match(tokenSource, /#faa718/i, 'accent should use La Fileto orange');

  for (const token of requiredTokens) {
    assert.match(tokenSource, new RegExp(`${token}\\s*:`), `${token} should be defined`);
  }

  const themeSource = read(path.join('src', 'react', 'ui', 'AdminThemeScope.jsx'));
  assert.match(themeSource, /adminTokens\.css/, 'AdminThemeScope should import isolated tokens');
  assert.match(themeSource, /adminReactTheme/, 'AdminThemeScope should apply the theme class');

  const jsxSources = expectedFiles
    .filter((file) => file.endsWith('.jsx'))
    .map((file) => read(path.join('src', 'react', 'ui', file)))
    .join('\n');

  assert.doesNotMatch(
    jsxSources,
    /className=["'][^"']*\bbtn\b/,
    'React primitives should not use legacy .btn',
  );
  assert.doesNotMatch(
    jsxSources,
    /className=["'][^"']*\bcard\b/,
    'React primitives should not use legacy .card',
  );
  assert.doesNotMatch(
    jsxSources,
    /className=["'][^"']*\bbadge\b/,
    'React primitives should not use legacy .badge',
  );

  const allUiStyles = expectedFiles
    .filter((file) => file.endsWith('.module.css'))
    .map((file) => read(path.join('src', 'react', 'ui', file)))
    .join('\n');

  assert.match(
    allUiStyles,
    /focus-visible/,
    'React primitive styles should define visible focus states',
  );

  const listSurfaceSource = read(path.join('src', 'react', 'ui', 'ListSurface.jsx'));
  assert.match(listSurfaceSource, /export function ListSurface/);
  assert.match(listSurfaceSource, /export function ListSurfaceHeader/);
  assert.match(listSurfaceSource, /export function ListSurfaceFooter/);
  assert.match(listSurfaceSource, /export function ListPagination/);
  assert.match(listSurfaceSource, /aria-live="polite"/);
  assert.match(listSurfaceSource, /aria-label=\{label\}/);

  const listSurfaceStyles = read(path.join('src', 'react', 'ui', 'ListSurface.module.css'));
  assert.match(listSurfaceStyles, /--admin-react-/);
  assert.match(listSurfaceStyles, /text-wrap:\s*balance/);
  assert.match(listSurfaceStyles, /@media\s*\(max-width:\s*760px\)/);

  const iconActionSource = read(path.join('src', 'react', 'ui', 'IconAction.jsx'));
  assert.match(iconActionSource, /<button\b/, 'IconAction should render a real button');
  assert.match(iconActionSource, /type = 'button'/, 'IconAction should default to type button');
  assert.match(
    iconActionSource,
    /aria-label=\{label\}/,
    'IconAction should expose label as aria-label',
  );
  assert.match(
    iconActionSource,
    /IconAction requires a non-empty label/,
    'IconAction should require a non-empty label',
  );
  assert.match(
    iconActionSource,
    /IconAction requires an icon/,
    'IconAction should require an icon',
  );
  assert.match(
    iconActionSource,
    /aria-hidden['"]?: 'true'/,
    'IconAction should make element icons decorative',
  );
  assert.match(
    iconActionSource,
    /disabled=\{disabled\}/,
    'IconAction should use a real disabled attribute',
  );
  assert.match(
    iconActionSource,
    /new Set\(\['neutral', 'primary', 'danger'\]\)/,
    'IconAction should support neutral, primary, and danger variants',
  );

  const iconActionStyles = read(path.join('src', 'react', 'ui', 'IconAction.module.css'));
  assert.match(iconActionStyles, /:focus-visible/, 'IconAction should define visible focus');
  assert.match(
    iconActionStyles,
    /touch-action:\s*manipulation/,
    'IconAction should optimize touch action',
  );
  assert.match(
    iconActionStyles,
    /(?:width|min-width|height|min-height):\s*2\.5rem/,
    'IconAction should provide a 40px default target',
  );
  assert.match(
    iconActionStyles,
    /@media\s*\(pointer:\s*coarse\)[\s\S]*2\.75rem/,
    'IconAction should provide a 44px coarse pointer target',
  );
  assert.match(
    iconActionStyles,
    /@media\s*\(max-width:\s*48rem\)[\s\S]*2\.75rem/,
    'IconAction should provide a 44px mobile target',
  );
  assert.match(iconActionStyles, /\.neutral\b/, 'IconAction should define neutral styles');
  assert.match(iconActionStyles, /\.primary\b/, 'IconAction should define primary styles');
  assert.match(iconActionStyles, /\.danger\b/, 'IconAction should define danger styles');
  assert.match(iconActionStyles, /\.tooltip\b/, 'IconAction should include a local visual tooltip');
  assert.match(
    iconActionStyles,
    /text-overflow:\s*ellipsis/,
    'IconAction tooltip should handle long labels without overflow',
  );
}
