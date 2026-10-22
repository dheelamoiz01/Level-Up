const fs = require('fs');
const path = require('path');

function patchFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.replace(from, to);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[patch-next] Successfully patched ${path.basename(filePath)}`);
  }
}

const entriesPath = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'build', 'entries.js');
patchFile(entriesPath, [
  [
    'return absolutePagePath.replace(_constants.PAGES_DIR_ALIAS, pagesDir);',
    'return absolutePagePath.replace(_constants.PAGES_DIR_ALIAS, () => pagesDir);'
  ],
  [
    'return absolutePagePath.replace(_constants.APP_DIR_ALIAS, appDir);',
    'return absolutePagePath.replace(_constants.APP_DIR_ALIAS, () => appDir);'
  ],
  [
    'return absolutePagePath.replace(_constants.ROOT_DIR_ALIAS, rootDir);',
    'return absolutePagePath.replace(_constants.ROOT_DIR_ALIAS, () => rootDir);'
  ]
]);

const loaderPath = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'build', 'webpack', 'loaders', 'next-app-loader.js');
patchFile(loaderPath, [
  [
    '.replace(/\\//g, _path.default.sep).replace(/^private-next-app-dir/, appDir);',
    '.replace(/\\//g, _path.default.sep).replace(/^private-next-app-dir/, () => appDir);'
  ]
]);
