const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'test-results', 'jest-timings.json');
if (!fs.existsSync(file)) {
  console.error('timings file not found:', file);
  process.exit(2);
}
try {
  const raw = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(raw);
  const results = data.testResults || data.testResults || null;
  if (!results) {
    console.error('No testResults found in JSON');
    process.exit(3);
  }
  const entries = results.map(r => ({ file: r.name || r.testFilePath || r.testFile, duration: r.duration || 0 })).sort((a,b)=>b.duration-a.duration);
  const top = entries.slice(0,20);
  console.log(JSON.stringify({ totalSuites: entries.length, top }, null, 2));
} catch (e) {
  console.error('Failed to parse timings JSON:', e.message);
  process.exit(4);
}
