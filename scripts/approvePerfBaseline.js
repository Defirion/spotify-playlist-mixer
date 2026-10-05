/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { verifyCurrent } = require('./perfRecord');

function approveBaseline(filename, runId) {
  if (!/^baseline-[A-Za-z0-9_-]+\.json$/.test(filename || ''))
    throw new Error('Baseline name must be a simple baseline-*.json filename.');
  if (!runId)
    throw new Error('An explicit freshly generated run ID is required.');
  const directory = path.join(
    __dirname,
    '../src/__tests__/performance/baselines'
  );
  const current = JSON.parse(
    fs.readFileSync(path.join(directory, 'current-run.json'), 'utf8')
  );
  verifyCurrent(current, runId);
  const target = path.join(directory, filename);
  if (fs.existsSync(target))
    throw new Error(
      'Timestamped baseline already exists; choose a new name to preserve history.'
    );
  const contents = JSON.stringify(current, null, 2) + '\n';
  fs.writeFileSync(target, contents);
  fs.writeFileSync(path.join(directory, 'last-baseline.json'), contents);
  console.log(`Approved run ${runId}: ${filename} and last-baseline.json`);
}

if (require.main === module) {
  try {
    approveBaseline(process.argv[2], process.argv[3]);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
module.exports = { approveBaseline };
