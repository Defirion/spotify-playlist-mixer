const fs = require('fs');
const path = require('path');

// Config
const BASELINE_PATH = path.join(__dirname, '../src/__tests__/performance/baselines/last-baseline.json');
const CURRENT_PATH = path.join(__dirname, '../src/__tests__/performance/baselines/current-run.json');
const THRESHOLD_PERCENT = Number(process.env.PERF_REGRESS_THRESHOLD || 10); // percent

function loadJson(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error('Failed to parse', p, e.message);
    return null;
  }
}

const baseline = loadJson(BASELINE_PATH);
const current = loadJson(CURRENT_PATH);

if (!baseline) {
  console.error('Baseline not found at', BASELINE_PATH);
  process.exit(2);
}
if (!current) {
  console.error('Current run not found at', CURRENT_PATH);
  process.exit(2);
}

// Compare key metrics: mixedCount and elapsedMs (lower is better for elapsedMs)
const metrics = ['mixedCount', 'elapsedMs'];
let failed = false;
const deltas = {};

metrics.forEach(k => {
  const b = baseline[k];
  const c = current[k];
  if (typeof b !== 'number' || typeof c !== 'number') return;

  // For mixedCount, regression means current < baseline
  if (k === 'mixedCount') {
    const drop = ((b - c) / b) * 100;
    deltas[k] = drop;
    if (drop > THRESHOLD_PERCENT) {
      console.error(`REGRESSION: ${k} dropped by ${drop.toFixed(2)}% (baseline=${b}, current=${c})`);
      failed = true;
    }
  }

  // For elapsedMs, regression means current > baseline
  if (k === 'elapsedMs') {
    const rise = ((c - b) / b) * 100;
    deltas[k] = rise;
    if (rise > THRESHOLD_PERCENT) {
      console.error(`REGRESSION: ${k} increased by ${rise.toFixed(2)}% (baseline=${b}, current=${c})`);
      failed = true;
    }
  }
});

if (!failed) {
  console.log('Perf check passed', deltas);
  process.exit(0);
}

process.exit(1);
