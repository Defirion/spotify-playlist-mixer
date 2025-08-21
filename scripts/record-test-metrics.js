/* eslint-disable no-console */
/**
 * Executes the jest test command with coverage disabled (faster) to measure runtime.
 * Stores metrics in test-metrics.json for baseline + trend tracking.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const METRICS_FILE = path.join(__dirname, '..', 'test-metrics.json');

function run() {
  const start = Date.now();
  const jest = spawn('npx', ['react-scripts', 'test', '--watchAll=false', '--coverage=false'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CI: 'true' }
  });
  let stdout = '';
  jest.stdout.on('data', (d) => (stdout += d.toString()));
  jest.stderr.on('data', (d) => (stdout += d.toString()));
  jest.on('close', (code) => {
    const end = Date.now();
    const duration = end - start;
    let suites = null;
    let tests = null;
    const suitesMatch = stdout.match(/Test suites: (\d+) passed, (\d+) total/);
    const testsMatch = stdout.match(/Tests: (\d+) passed, (\d+) total/);
    if (suitesMatch) suites = Number(suitesMatch[2]);
    if (testsMatch) tests = Number(testsMatch[2]);

    let metrics = { runs: [] };
    if (fs.existsSync(METRICS_FILE)) {
      try { metrics = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8')); } catch (e) {}
    }
    metrics.runs.push({ date: new Date().toISOString(), durationMs: duration, suites, tests, exitCode: code });
    if (metrics.runs.length > 50) metrics.runs.splice(0, metrics.runs.length - 50);
    fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
    console.log(`Test metrics recorded: ${duration}ms (exit ${code})`);
    process.exit(code);
  });
}

run();
