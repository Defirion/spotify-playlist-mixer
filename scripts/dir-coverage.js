// Prints statement coverage aggregated for src/utils/mixer and src/services.
// Usage: node scripts/dir-coverage.js [path-to-coverage-summary.json]
const path = process.argv[2] || './coverage/coverage-summary.json';
const summary = require(require('path').resolve(path));
const agg = {};
for (const [file, data] of Object.entries(summary)) {
  if (file === 'total') continue;
  const f = file.replace(/\\/g, '/');
  let key = null;
  if (f.includes('/src/utils/mixer/')) key = 'src/utils/mixer';
  else if (f.includes('/src/services/')) key = 'src/services';
  if (!key) continue;
  agg[key] = agg[key] || { covered: 0, total: 0 };
  agg[key].covered += data.statements.covered;
  agg[key].total += data.statements.total;
}
for (const [key, { covered, total }] of Object.entries(agg)) {
  console.log(`${key}: ${((100 * covered) / total).toFixed(2)}% (${covered}/${total} statements)`);
}
