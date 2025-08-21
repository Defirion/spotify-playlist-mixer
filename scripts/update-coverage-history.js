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
      if (typeof data.numTotalTestSuites === 'number') suites = data.numTotalTestSuites;
      if (typeof data.numTotalTests === 'number') tests = data.numTotalTests;
      runtimeMs = typeof data.startTime === 'number' ? Date.now() - data.startTime : null;
    } catch (e) {
      console.warn('Could not parse jest-output.json, fallback to text parsing', e.message);
    }
  }
  if ((suites == null || tests == null) && fs.existsSync(OUTPUT_TXT)) {
    try {
      const txt = fs.readFileSync(OUTPUT_TXT, 'utf8');
      // Find the last occurrence of summary lines to reflect final aggregated result.
      const suiteRegexes = [
        /Test Suites:\s+(?:\d+ failed, \s*)?(?:\d+ skipped, \s*)?(?:\d+ todo, \s*)?(?:\d+ pending, \s*)?(\d+) passed, (\d+) total/gi,
        /Test Suites:\s+(\d+) passed, (\d+) total/gi,
        /Test Suites:\s+(\d+) total/gi
      ];
      const testRegexes = [
        /Tests:\s+(?:\d+ failed, \s*)?(?:\d+ skipped, \s*)?(?:\d+ todo, \s*)?(?:\d+ pending, \s*)?(\d+) passed, (\d+) total/gi,
        /Tests:\s+(\d+) passed, (\d+) total/gi,
        /Tests:\s+(\d+) total/gi
      ];
      function extractLast(regexList, text) {
        for (const re of regexList) {
          let m; let last = null;
          while ((m = re.exec(text)) !== null) {
            last = m;
          }
          if (last) return last;
        }
        return null;
      }
      const suiteLast = extractLast(suiteRegexes, txt);
      if (suiteLast) {
        // Prefer total if provided at capture group 2 else group 1
        suites = Number(suiteLast[suiteLast.length - 1]);
      }
      const testLast = extractLast(testRegexes, txt);
      if (testLast) {
        tests = Number(testLast[testLast.length - 1]);
      }
      // As a fallback, attempt simpler patterns for combined fail/pass counts (e.g., "30 failed, 77 passed, 107 total")
      if (suites == null) {
        const altSuites = /Test Suites:\s+(?:\d+ failed,\s*)?(?:\d+ passed,\s*)?(\d+) total/gi;
        let m; while ((m = altSuites.exec(txt)) !== null) suites = Number(m[1]);
      }
      if (tests == null) {
        const altTests = /Tests:\s+(?:\d+ failed,\s*)?(?:\d+ passed,\s*)?(\d+) total/gi;
        let m; while ((m = altTests.exec(txt)) !== null) tests = Number(m[1]);
      }

      // If still missing or suspiciously low compared to other batch outputs, attempt aggregation.
      if ((suites == null || tests == null) || (suites < 110 && fs.existsSync(path.join(__dirname,'..','test-results')))) {
        try {
          const dir = path.join(__dirname, '..', 'test-results');
          const files = fs.readdirSync(dir).filter(f => /-stdout\.txt$/.test(f));
          let aggSuites = 0; let aggTests = 0; let foundAny = false;
            for (const f of files) {
              const content = fs.readFileSync(path.join(dir, f), 'utf8');
              const suiteLine = [...content.matchAll(/Test Suites:\s+(?:\d+ failed,\s*)?(?:\d+ passed,\s*)?(\d+) total/gi)].pop();
              const testLine = [...content.matchAll(/Tests:\s+(?:\d+ failed,\s*)?(?:\d+ passed,\s*)?(\d+) total/gi)].pop();
              if (suiteLine) { aggSuites += Number(suiteLine[1]); foundAny = true; }
              if (testLine) { aggTests += Number(testLine[1]); foundAny = true; }
            }
          if (foundAny) {
            // Only replace if aggregated counts are larger (indicating parallel batch collection).
            if (aggSuites > (suites || 0)) suites = aggSuites;
            if (aggTests > (tests || 0)) tests = aggTests;
          }
        } catch (aggErr) {
          console.warn('Aggregation across batch stdout failed', aggErr.message);
        }
      }
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
