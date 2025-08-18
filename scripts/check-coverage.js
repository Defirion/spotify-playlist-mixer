/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const COVERAGE_DIR = path.join(__dirname, '..', 'coverage');
const COVERAGE_FILE = path.join(COVERAGE_DIR, 'coverage-summary.json');
const ALT_COVERAGE_FILE = path.join(COVERAGE_DIR, 'coverage-final.json');
const MIN_COVERAGE = process.env.COVERAGE_THRESHOLD ? Number(process.env.COVERAGE_THRESHOLD) : 60;

let summary = null;
if (fs.existsSync(COVERAGE_FILE)) {
  summary = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
} else if (fs.existsSync(ALT_COVERAGE_FILE)) {
  const alt = JSON.parse(fs.readFileSync(ALT_COVERAGE_FILE, 'utf8'));
  // react-scripts sometimes outputs coverage-final.json with detailed per-file data
  // (statementMap + s counters). Build an overall summary by summing statements
  // and covered counts when a root 'total' entry isn't present.
  if (alt.total) {
    summary = { total: alt.total };
  } else {
    // Prefer an explicit root entry if present
    if (alt[''] && alt[''].statements) {
      summary = { total: { statements: alt[''].statements } };
    } else {
      // Aggregate per-file statement counts and covered counters from
      // Istanbul "coverage-final.json" structure: statementMap + s.
      let totalStatements = 0;
      let coveredStatements = 0;
      Object.values(alt).forEach((file) => {
        if (file && file.statementMap && file.s) {
          const stmtCount = Object.keys(file.statementMap).length;
          const covered = Object.values(file.s).filter((c) => Number(c) > 0).length;
          totalStatements += stmtCount;
          coveredStatements += covered;
        }
      });

      if (totalStatements > 0) {
        const pct = Math.round((coveredStatements / totalStatements) * 10000) / 100; // two decimals
        summary = { total: { statements: { pct } } };
      } else {
        // fallback: if some files contain a statements.pct value, average them
        const totals = Object.values(alt).filter((v) => v && v.statements && typeof v.statements.pct === 'number');
        if (totals.length > 0) {
          const avg = totals.reduce((s, t) => s + t.statements.pct, 0) / totals.length;
          summary = { total: { statements: { pct: Math.round(avg * 100) / 100 } } };
        }
      }
    }
  }
}

if (!summary) {
  console.error('Coverage summary not found in coverage directory:', COVERAGE_DIR);
  process.exit(2);
}

const total = summary.total || null;
if (!total) {
  console.error('Unable to read total coverage from summary file');
  process.exit(2);
}

const pct = total.statements.pct;
console.log(`Statements coverage: ${pct}% (threshold ${MIN_COVERAGE}%)`);
if (pct < MIN_COVERAGE) {
  console.error(`Coverage ${pct}% is below threshold ${MIN_COVERAGE}%`);
  process.exit(1);
}
console.log('Coverage threshold satisfied');
process.exit(0);
