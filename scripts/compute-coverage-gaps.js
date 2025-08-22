const fs = require('fs');
const path = require('path');

const COVERAGE_FINAL = path.resolve(__dirname, '..', 'coverage', 'coverage-final.json');
if (!fs.existsSync(COVERAGE_FINAL)) {
  console.error('coverage-final.json not found');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(COVERAGE_FINAL, 'utf8'));
// Extract metadata if present
const meta = {
  snapshotTimestamp: data.__snapshotTimestamp || null,
  snapshotFilename: data.__snapshotFilename || null,
};

function pct(covered, total) { if (total === 0) return 100; return Math.round(10000 * (covered / total)) / 100; }

const files = Object.keys(data).filter(k => !k.startsWith('__')).map((k) => {
  const entry = data[k];
  const sMap = entry.statementMap || {};
  const sCounts = entry.s || {};
  const totalSt = Object.keys(sMap).length;
  const coveredSt = Object.values(sCounts).filter(v => Number(v) > 0).length;

  const bMap = entry.branchMap || entry.b || {};
  let totalBr = 0, coveredBr = 0;
  // branch maps have different shapes across tools; try both
  if (entry.b) {
    for (const bid of Object.keys(entry.b)) {
      const arr = entry.b[bid] || [];
      totalBr += arr.length;
      for (const c of arr) { if (c > 0) coveredBr++; }
    }
  } else if (entry.branchMap) {
    // branchMap keys map to locations whose outcomes are in entry.b normally; fall back to zero
    totalBr = Object.keys(entry.branchMap).length;
  }

  return {
    file: entry.path || k,
    statements: { total: totalSt, covered: coveredSt, pct: pct(coveredSt, totalSt) },
    branches: { total: totalBr, covered: coveredBr, pct: pct(coveredBr, totalBr) }
  };
});

files.sort((a, b) => {
  if (a.statements.pct !== b.statements.pct) return a.statements.pct - b.statements.pct;
  return a.branches.pct - b.branches.pct;
});

const linesThreshold = 95;
const branchesThreshold = 85;
const lagging = files.filter(f => f.statements.pct < linesThreshold || f.branches.pct < branchesThreshold);
const topN = lagging.slice(0, 40);

const out = { meta, totalFiles: files.length, laggingCount: lagging.length, top: topN };
console.log(JSON.stringify(out, null, 2));
