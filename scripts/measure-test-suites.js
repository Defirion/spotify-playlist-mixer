const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function listTests() {
  const jestConfig = path.resolve(__dirname, '..', 'jest.config.js');
  const res = spawnSync('npx', ['jest', '--listTests', '--json', '--config', jestConfig], { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error('Failed to list tests:', res.stderr || res.stdout);
    process.exit(res.status || 1);
  }
  try {
    return JSON.parse(res.stdout);
  } catch (e) {
    console.error('Failed to parse test list JSON', e.message);
    process.exit(2);
  }
}

function runTest(testPath) {
  const start = process.hrtime.bigint();
  // Use runTestsByPath to run a single file; keep colors off and silent output
  const jestConfig = path.resolve(__dirname, '..', 'jest.config.js');
  const res = spawnSync('npx', ['jest', '--runTestsByPath', testPath, '--runInBand', '--silent', '--config', jestConfig], { encoding: 'utf8' });
  const end = process.hrtime.bigint();
  const ms = Number(end - start) / 1e6;
  return { path: testPath, durationMs: Math.round(ms), status: res.status, stdout: res.stdout, stderr: res.stderr };
}

function main() {
  const tests = listTests();
  const results = [];
  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    console.log(`(${i+1}/${tests.length}) Running: ${t}`);
    const r = runTest(t);
    results.push(r);
    // Write partial results to disk as we go
    fs.writeFileSync(path.resolve(__dirname, '..', 'test-results', 'jest-measurements.json'), JSON.stringify({ measured: results }, null, 2));
  }
  // final write
  fs.writeFileSync(path.resolve(__dirname, '..', 'test-results', 'jest-measurements.json'), JSON.stringify({ measured: results }, null, 2));
  // Print top 20
  const top = results.slice().sort((a,b)=>b.durationMs-a.durationMs).slice(0,20);
  console.log(JSON.stringify({ total: results.length, top }, null, 2));
}

if (require.main === module) main();
