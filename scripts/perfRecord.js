const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');

function sourceHash() {
  const files = fs
    .readdirSync(path.join(root, 'src/utils/mixer'))
    .filter(file => file.endsWith('.ts'))
    .sort()
    .map(file => `src/utils/mixer/${file}`);
  files.push(
    'src/types/domain.ts',
    'src/types/mixer.ts',
    'src/__tests__/performance/mixer.performance.test.ts'
  );
  const hash = crypto.createHash('sha256');
  for (const file of files)
    hash
      .update(file)
      .update(
        fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
      );
  return hash.digest('hex');
}

function validateRecord(record) {
  if (
    record?.schemaVersion !== 2 ||
    !record.workload ||
    !record.context ||
    !record.provenance
  )
    throw new Error(
      'Missing workload/context/provenance or unsupported schema; generate a fresh version-2 run.'
    );
  for (const key of ['elapsedMs', 'heapDelta', 'mixedCount']) {
    if (!Number.isFinite(record[key]))
      throw new Error(`Missing or invalid metric: ${key}`);
  }
  if (
    record.elapsedMs <= 0 ||
    !Number.isInteger(record.mixedCount) ||
    record.mixedCount <= 0
  )
    throw new Error('Runtime and output count must be positive.');
  if (
    !record.provenance.runId ||
    !record.provenance.commit ||
    !record.provenance.sourceHash ||
    !Number.isFinite(Date.parse(record.provenance.timestamp))
  )
    throw new Error('Incomplete run provenance.');
  for (const key of [
    'mode',
    'sourceSizes',
    'ratioConfig',
    'options',
    'trackDurationMs',
    'samples',
    'warmups',
  ]) {
    if (record.workload[key] === undefined)
      throw new Error(`Missing workload field: ${key}`);
  }
  for (const key of [
    'node',
    'vitest',
    'platform',
    'arch',
    'cpu',
    'runner',
    'invocation',
  ]) {
    if (!record.context[key]) throw new Error(`Missing runner field: ${key}`);
  }
}

function verifyCurrent(record, expectedRunId, now = Date.now()) {
  validateRecord(record);
  if (expectedRunId && record.provenance.runId !== expectedRunId)
    throw new Error(
      'Selected run ID does not match the freshly generated run.'
    );
  const age = now - Date.parse(record.provenance.timestamp);
  if (age < -60000 || age > 24 * 60 * 60 * 1000)
    throw new Error('Current run is stale; run npm run test:perf again.');
  if (record.provenance.sourceHash !== sourceHash())
    throw new Error(
      'Current run does not match the current mixer and benchmark sources.'
    );
}

module.exports = { sourceHash, validateRecord, verifyCurrent };
