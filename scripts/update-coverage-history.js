/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

// Reads coverage-summary.json (preferred) or derives from coverage-final.json via check-coverage helper logic
// then appends an entry to coverage-history.json.

const COVERAGE_DIR = path.join(__dirname, '..', 'coverage');
const SUMMARY = path.join(COVERAGE_DIR, 'coverage-summary.json');
const FINAL = path.join(COVERAGE_DIR, 'coverage-final.json');
const HISTORY_FILE = path.join(__dirname, '..', 'coverage-history.json');

function derivePctFromFinal() {
  if (!fs.existsSync(FINAL)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(FINAL, 'utf8'));
    if (data.total && data.total.statements && typeof data.total.statements.pct === 'number') {
      return data.total.statements.pct;
    }
    let totalStatements = 0;
    let coveredStatements = 0;
    Object.values(data).forEach((file) => {
      if (file && file.statementMap && file.s) {
        const stmtCount = Object.keys(file.statementMap).length;
        const covered = Object.values(file.s).filter((c) => Number(c) > 0).length;
        totalStatements += stmtCount;
        coveredStatements += covered;
      }
    });
    if (totalStatements > 0) {
      return Math.round((coveredStatements / totalStatements) * 10000) / 100;
    }
  } catch (e) {
    console.error('Failed to read coverage-final.json', e.message);
  }
  return null;
}

function readSummary() {
  if (fs.existsSync(SUMMARY)) {
    try {
      const summary = JSON.parse(fs.readFileSync(SUMMARY, 'utf8'));
      if (summary.total && summary.total.statements && typeof summary.total.statements.pct === 'number') {
        return summary.total.statements.pct;
      }
    } catch (e) {
      console.warn('Unable to parse coverage-summary.json', e.message);
    }
  }
  return derivePctFromFinal();
}

// Attempt to parse jest test output for counts & runtime (look for jest-output.json else jest-latest-output.txt)
function readTestCounts() {
  const OUTPUT_JSON = path.join(__dirname, '..', 'test-results', 'jest-output.json');
  const OUTPUT_TXT = path.join(__dirname, '..', 'test-results', 'jest-latest-output.txt');
  let suites = null;
  let tests = null;
  let runtimeMs = null;
  if (fs.existsSync(OUTPUT_JSON)) {
    try {
      const data = JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8'));
      suites = data.numPassedTestSuites === data.numTotalTestSuites ? data.numTotalTestSuites : data.numTotalTestSuites;
      tests = data.numPassedTests === data.numTotalTests ? data.numTotalTests : data.numTotalTests;
      runtimeMs = typeof data.startTime === 'number' && typeof data.success === 'boolean' ? Date.now() - data.startTime : null;
    } catch (e) {
      console.warn('Could not parse jest-output.json, fallback to text parsing', e.message);
    }
  }
  if ((suites == null || tests == null) && fs.existsSync(OUTPUT_TXT)) {
    try {
      const txt = fs.readFileSync(OUTPUT_TXT, 'utf8');
      const suiteMatch = txt.match(/Test suites: (\d+) passed, (\d+) total/);
      const testMatch = txt.match(/Tests: (\d+) passed, (\d+) total/);
      if (suiteMatch) suites = Number(suiteMatch[2]);
      if (testMatch) tests = Number(testMatch[2]);
    } catch (e) {
      console.warn('Failed to parse jest-latest-output.txt', e.message);
    }
  }
  return { suites, tests, runtimeMs };
}

function loadHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {
      console.warn('History parse error, recreating', e.message);
    }
  }
  return { history: [] };
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function main() {
  const pct = readSummary();
  if (pct == null) {
    console.error('Unable to determine coverage %');
    process.exit(1);
  }
  const { suites, tests, runtimeMs } = readTestCounts();
  const now = new Date();
  const iso = now.toISOString();
  // Always append a new snapshot (retain multiple entries per day)
  const history = loadHistory();
  const entry = { date: iso, statementsPct: pct, suites: suites ?? 0, tests: tests ?? 0, runtimeMs };
  history.history.push(entry);
  // Keep only latest 50 entries to bound file size
  if (history.history.length > 50) {
    history.history.splice(0, history.history.length - 50);
  }
  saveHistory(history);
  console.log('Coverage history updated:', entry);
}

if (require.main === module) {
  main();
}
