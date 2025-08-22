const fs = require('fs');
const path = require('path');

const coverageFile = path.resolve(__dirname, '..', 'coverage', 'coverage-final.json');
const snapshotsDir = path.resolve(__dirname, '..', 'coverage', 'snapshots');
const historyFile = path.resolve(__dirname, '..', 'coverage-history.json');

if (!fs.existsSync(coverageFile)) {
  console.error('coverage-final.json not found at', coverageFile);
  process.exit(1);
}

const snapshot = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });

// Use an ISO timestamp for metadata, and a sanitized filename for the snapshot file
const isoNow = new Date().toISOString();
const filenameTime = isoNow.replace(/[:.]/g, '-');
const outFilename = `coverage-snapshot-${filenameTime}.json`;
const outPath = path.join(snapshotsDir, outFilename);

// Attach metadata to the snapshot object so both the snapshot file and coverage-final.json
// contain the same timestamp and filename for easy verification.
snapshot.__snapshotTimestamp = isoNow;
snapshot.__snapshotFilename = outFilename;

fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf8');
console.log('Wrote snapshot to', outPath);

// Also update the repository's coverage-final.json with the same metadata so consumers
// can detect that the snapshot flow ran and the coverage file was refreshed.
try {
  const finalJson = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
  finalJson.__snapshotTimestamp = isoNow;
  finalJson.__snapshotFilename = outFilename;
  fs.writeFileSync(coverageFile, JSON.stringify(finalJson, null, 2), 'utf8');
  console.log('Updated coverage-final.json with snapshot metadata');
} catch (e) {
  console.warn('Failed to write snapshot metadata to coverage-final.json:', e.message);
}

// Compute overall statements % quickly
const entries = Object.values(snapshot);
let totalStatements = 0;
let coveredStatements = 0;
for (const v of entries) {
  const total = Object.keys(v.statementMap || {}).length;
  const covered = Object.values(v.s || {}).filter(x => x > 0).length;
  totalStatements += total;
  coveredStatements += covered;
}
const statementsPct = totalStatements ? (coveredStatements / totalStatements) * 100 : 0;

// Update coverage-history.json
let history = { history: [] };
if (fs.existsSync(historyFile)) {
  try { history = JSON.parse(fs.readFileSync(historyFile, 'utf8')); } catch (e) { /* ignore */ }
}
history.history = history.history || [];
history.history.push({ date: new Date().toISOString(), statementsPct: Number(statementsPct.toFixed(2)), snapshot: path.relative(path.resolve(__dirname, '..'), outPath) });
fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf8');
console.log('Appended entry to', historyFile);

process.exit(0);
