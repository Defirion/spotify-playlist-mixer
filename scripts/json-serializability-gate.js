#!/usr/bin/env node

/**
 * JSON Serializability Gate Runner
 * 
 * This script runs the JSON serializability tests as a gate before the main test suite.
 * If any fixtures fail serializability checks, the script exits with code 1 to prevent
 * Jest worker crashes from circular JSON structures.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 Running JSON serializability gate...');

try {
  // Run only the serializability test
  const result = execSync(
    'npm test -- --testPathPattern=json-serializability.test.ts --watchAll=false --verbose',
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      encoding: 'utf8'
    }
  );
  
  console.log('✅ JSON serializability gate passed - all fixtures are safe for Jest workers');
  process.exit(0);
} catch (error) {
  console.error('❌ JSON serializability gate failed - fixtures contain non-serializable objects');
  console.error('This will cause Jest worker crashes with "Converting circular structure to JSON" errors');
  console.error('Fix the fixture objects before running the main test suite');
  process.exit(1);
}