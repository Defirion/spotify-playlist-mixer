const fs = require('fs');
const path = require('path');

const COVERAGE_FINAL = path.resolve(__dirname, '..', 'coverage', 'coverage-final.json');
const HISTORY = path.resolve(__dirname, '..', 'coverage-history.json');

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

function computeFromCoverageObject(data) {
  const files = Object.keys(data).filter(k => !k.startsWith('__')).map((k) => {
    const entry = data[k];
    const sMap = entry.statementMap || {};
    const sCounts = entry.s || {};
    const totalSt = Object.keys(sMap).length;
    const coveredSt = Object.values(sCounts).filter(v => Number(v) > 0).length;

    const bMap = entry.branchMap || entry.b || {};
    let totalBr = 0, coveredBr = 0;
    if (entry.b) {
      for (const bid of Object.keys(entry.b)) {
        const arr = entry.b[bid] || [];
        totalBr += arr.length;
        for (const c of arr) { if (c > 0) coveredBr++; }
      }
    } else if (entry.branchMap) {
      totalBr = Object.keys(entry.branchMap).length;
    }

    const pct = (covered, total) => (total === 0 ? 100 : Math.round(10000 * (covered / total)) / 100);
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
  return { totalFiles: files.length, laggingCount: lagging.length, top: lagging.slice(0, 40) };
}

function computeFromSnapshotPath(snapshotPath) {
  const abs = path.resolve(__dirname, '..', snapshotPath);
  if (!fs.existsSync(abs)) return null;
  const raw = loadJson(abs);
  if (!raw) return null;
  return computeFromCoverageObject(raw);
}

function computeFromCoverageFinal() {
  if (!fs.existsSync(COVERAGE_FINAL)) return null;
  const raw = loadJson(COVERAGE_FINAL);
  if (!raw) return null;
  return computeFromCoverageObject(raw);
}

function main() {
  const current = computeFromCoverageFinal();
  if (!current) {
    console.error('Unable to compute current coverage from', COVERAGE_FINAL);
    process.exit(2);
  }

  const history = loadJson(HISTORY) || { history: [] };
  const entries = history.history || [];
  // Find previous snapshot entry (second to last) if available
  const prevEntry = entries.length >= 2 ? entries[entries.length - 2] : null;
  let prev = null;
  if (prevEntry && prevEntry.snapshot) {
    prev = computeFromSnapshotPath(prevEntry.snapshot);
  }

  console.log('Current laggingCount:', current.laggingCount);
  if (!prev) {
    console.log('No previous snapshot to compare against — passing.');
    process.exit(0);
  }
  console.log('Previous laggingCount:', prev.laggingCount);

  const allowedIncrease = 5; // generous threshold
  const increase = current.laggingCount - prev.laggingCount;
  const currentTop10 = new Set(current.top.slice(0, 10).map(f => f.file));
  const prevTop10 = new Set(prev.top.slice(0, 10).map(f => f.file));
  const newTopFiles = [...currentTop10].filter(f => !prevTop10.has(f));

  if (increase > allowedIncrease || newTopFiles.length > 0) {
    console.error('Coverage gaps check failed.');
    if (increase > allowedIncrease) console.error(`  laggingCount increased by ${increase} (> ${allowedIncrease})`);
    if (newTopFiles.length > 0) {
      console.error('  New files in top-10 lagging list:');
      newTopFiles.forEach(f => console.error('   -', f));
    }
    console.error('Run `npm run coverage:gaps` to view current gaps and `npm run coverage:record` to refresh snapshots if necessary.');
    process.exit(5);
  }

  console.log('Coverage gaps check passed.');
  process.exit(0);
}

if (require.main === module) main();
