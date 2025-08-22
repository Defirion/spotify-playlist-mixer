const fs = require('fs');
const path = require('path');

const COVERAGE_FINAL = path.resolve(__dirname, '..', 'coverage', 'coverage-final.json');
if (!fs.existsSync(COVERAGE_FINAL)) {
  console.error('coverage-final.json not found at', COVERAGE_FINAL);
  process.exit(2);
}

try {
  const data = JSON.parse(fs.readFileSync(COVERAGE_FINAL, 'utf8'));
  const ts = data.__snapshotTimestamp;
  const fn = data.__snapshotFilename;
  if (!ts || !fn) {
    console.error('coverage-final.json is missing snapshot metadata. Run `npm run coverage:record` to create a new snapshot.');
    process.exit(3);
  }
  console.log('coverage-final.json snapshot metadata present:');
  console.log('  __snapshotTimestamp:', ts);
  console.log('  __snapshotFilename:', fn);
  process.exit(0);
} catch (e) {
  console.error('Failed to parse coverage-final.json:', e.message);
  process.exit(4);
}
