/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { validateRecord, verifyCurrent } = require('./perfRecord');

const canonical = value =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map(key => [key, canonical(value[key])])
        )
      : value;

function compareRecords(baseline, current, threshold = 10) {
  validateRecord(baseline);
  validateRecord(current);
  if (!Number.isFinite(threshold) || threshold < 0)
    throw new Error('Invalid regression threshold.');
  for (const key of ['workload', 'context']) {
    if (
      JSON.stringify(canonical(baseline[key])) !==
      JSON.stringify(canonical(current[key]))
    )
      throw new Error(
        `Incompatible ${key}; approve a baseline from the same workload and runner.`
      );
  }
  if (current.mixedCount !== baseline.mixedCount)
    return {
      code: 1,
      message: `CORRECTNESS: output count changed (${baseline.mixedCount} -> ${current.mixedCount}).`,
    };
  const rise =
    ((current.elapsedMs - baseline.elapsedMs) / baseline.elapsedMs) * 100;
  return {
    code: rise > threshold ? 1 : 0,
    message: `${rise > threshold ? 'REGRESSION' : 'Perf check passed'}: runtime change ${rise.toFixed(2)}% (threshold ${threshold}%).`,
  };
}

if (require.main === module) {
  try {
    const directory = path.join(
      __dirname,
      '../src/__tests__/performance/baselines'
    );
    const baseline = JSON.parse(
      fs.readFileSync(
        process.env.PERF_BASELINE_PATH ||
          path.join(directory, 'last-baseline.json'),
        'utf8'
      )
    );
    const current = JSON.parse(
      fs.readFileSync(
        process.env.PERF_CURRENT_PATH ||
          path.join(directory, 'current-run.json'),
        'utf8'
      )
    );
    verifyCurrent(current, process.env.PERF_RUN_ID);
    const result = compareRecords(
      baseline,
      current,
      Number(process.env.PERF_REGRESS_THRESHOLD || 10)
    );
    console.log(result.message);
    process.exitCode = result.code;
  } catch (error) {
    console.error(`Perf comparison unavailable: ${error.message}`);
    process.exitCode = 2;
  }
}

module.exports = { compareRecords };
