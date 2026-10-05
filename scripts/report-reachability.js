/* eslint-disable no-console */
// Static import reachability complements ts-prune: test consumers do not make
// a module reachable from the application. Nonliteral imports need manual review.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const relative = file => path.relative(root, file).replace(/\\/g, '/');
const walk = directory =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
const files = walk(path.join(root, 'src')).filter(file => /\.tsx?$/.test(file));
const config = ts.readConfigFile(
  path.join(root, 'tsconfig.json'),
  ts.sys.readFile
);
const options = ts.parseJsonConfigFileContent(
  config.config,
  ts.sys,
  root
).options;
const edges = new Map();
const unresolved = [];
const dynamic = [];
for (const file of files) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  const dependencies = new Set();
  const visit = node => {
    let specifier;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      specifier = node.moduleSpecifier;
    } else if (ts.isCallExpression(node)) {
      const name = node.expression.getText(source);
      if (
        ['import', 'require', 'vi.mock', 'vi.doMock', 'jest.mock'].includes(
          name
        )
      ) {
        specifier = node.arguments[0];
        if (specifier && !ts.isStringLiteral(specifier))
          dynamic.push({
            file: relative(file),
            expression: node.getText(source),
          });
      }
    }
    if (specifier && ts.isStringLiteral(specifier)) {
      const resolved = ts.resolveModuleName(
        specifier.text,
        file,
        options,
        ts.sys
      ).resolvedModule;
      if (resolved && !resolved.isExternalLibraryImport)
        dependencies.add(path.resolve(resolved.resolvedFileName));
      else if (
        /^(\.|@\/)/.test(specifier.text) &&
        !/\.(css|svg|png|jpg)$/.test(specifier.text)
      )
        unresolved.push({ file: relative(file), import: specifier.text });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  edges.set(file, [...dependencies]);
}
const reachable = new Set();
const queue = [path.join(root, 'src/index.tsx')];
while (queue.length) {
  const file = queue.pop();
  if (reachable.has(file)) continue;
  reachable.add(file);
  queue.push(...(edges.get(file) || []));
}
const implementation = files.filter(
  file =>
    !/(__tests__|__mocks__|test-utils|mocks)[/\\]|\.test\.|\.d\.ts$/.test(
      file
    ) && !file.endsWith('setupTests.ts')
);
const report = {
  entrypoint: 'src/index.tsx',
  scope:
    'Static imports, re-exports, literal require/dynamic import, and test mock registrations; runtime reachability may be smaller.',
  reachable: implementation.filter(file => reachable.has(file)).map(relative),
  inactive: implementation
    .filter(file => !reachable.has(file))
    .map(file => ({
      file: relative(file),
      consumers: [...edges]
        .filter(([, dependencies]) => dependencies.includes(file))
        .map(([consumer]) => relative(consumer)),
    })),
  unresolved,
  dynamic,
};
console.log(JSON.stringify(report, null, 2));
if (unresolved.length) process.exitCode = 1;
