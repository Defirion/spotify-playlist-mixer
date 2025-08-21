const fs = require('fs');
const path = require('path');

function loadSnapshot(p) {
  if (!fs.existsSync(p)) throw new Error('Snapshot not found: ' + p);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function pctForFile(snapshot, filePath) {
  const v = snapshot[filePath];
  if (!v) return { total: 0, covered: 0, pct: 0 };
  const total = Object.keys(v.statementMap || {}).length;
  const covered = Object.values(v.s || {}).filter(x => x > 0).length;
  return { total, covered, pct: total ? (covered / total) * 100 : 0 };
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node coverage-diff.js <snapshotA.json> <snapshotB.json>');
  process.exit(2);
}
const [aPath, bPath] = args.map(p => path.resolve(p));
const a = loadSnapshot(aPath);
const b = loadSnapshot(bPath);

const files = new Set([...Object.keys(a), ...Object.keys(b)]);
const deltas = [];
for (const f of files) {
  const pa = pctForFile(a, f);
  const pb = pctForFile(b, f);
  const delta = Number((pb.pct - pa.pct).toFixed(2));
  if (delta !== 0) deltas.push({ file: f, a: pa.pct.toFixed(2), b: pb.pct.toFixed(2), delta });
}

deltas.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
console.log('Top coverage deltas (absolute change):');
console.table(deltas.slice(0, 40));

process.exit(0);
