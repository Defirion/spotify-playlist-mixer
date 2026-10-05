/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert/strict');
const { compareRecords } = require('../comparePerf');
const { sourceHash, verifyCurrent, validateRecord } = require('../perfRecord');

function record() {
  return {
    schemaVersion: 2,
    elapsedMs: 100,
    heapDelta: -10,
    mixedCount: 1200,
    workload: {
      mode: 'all',
      sourceSizes: { p1: 1000, p2: 600, p3: 400 },
      ratioConfig: {},
      options: {},
      trackDurationMs: 180000,
      samples: 5,
      warmups: 2,
    },
    context: {
      node: 'v22.18.0',
      vitest: '4.1.8',
      platform: 'linux',
      arch: 'x64',
      cpu: 'test',
      runner: 'local',
      invocation: 'test:perf',
    },
    provenance: {
      runId: 'fresh',
      timestamp: new Date().toISOString(),
      commit: 'test-commit',
      sourceHash: sourceHash(),
    },
  };
}

test('matched timing passes; a real timing regression fails at the unchanged threshold', () => {
  const baseline = record(),
    current = record();
  current.elapsedMs = 109;
  assert.equal(compareRecords(baseline, current).code, 0);
  current.elapsedMs = 120;
  assert.equal(compareRecords(baseline, current).code, 1);
  assert.match(compareRecords(baseline, current).message, /REGRESSION/);
});
test('output differences fail correctness independently of the timing threshold', () => {
  const baseline = record(),
    current = record();
  current.mixedCount--;
  assert.equal(compareRecords(baseline, current, 100).code, 1);
  assert.match(compareRecords(baseline, current).message, /CORRECTNESS/);
});
test('different workloads, hardware and invocation contexts are incompatible', () => {
  for (const change of [
    r => (r.workload.mode = 'count'),
    r => r.workload.sourceSizes.p1++,
    r => (r.context.node = 'v24.4.1'),
    r => (r.context.cpu = 'other'),
    r => (r.context.invocation = 'test:coverage'),
  ]) {
    const current = record();
    change(current);
    assert.throws(() => compareRecords(record(), current), /Incompatible/);
  }
});
test('missing metrics or provenance cannot silently pass', () => {
  for (const key of [
    'elapsedMs',
    'heapDelta',
    'mixedCount',
    'workload',
    'context',
    'provenance',
  ]) {
    const current = record();
    delete current[key];
    assert.throws(() => validateRecord(current), /Missing|unsupported/);
  }
});
test('fresh current source and selected run pass; stale, wrong-ID or changed-source runs fail', () => {
  const current = record();
  assert.doesNotThrow(() => verifyCurrent(current, 'fresh'));
  assert.throws(() => verifyCurrent(current, 'other'), /run ID/);
  current.provenance.sourceHash = 'old-source';
  assert.throws(() => verifyCurrent(current, 'fresh'), /sources/);
  current.provenance.sourceHash = sourceHash();
  current.provenance.timestamp = '2025-08-17T00:00:00Z';
  assert.throws(() => verifyCurrent(current, 'fresh'), /stale/);
});
