// Diagnostic script: start MSW server and perform a request to verify interception
const fetch = require('node-fetch');
const path = require('path');
// Resolve to the source mocks server (tests `require('../mocks/server')` from src/test-utils)
const serverPath = path.resolve(__dirname, '..', 'src', 'mocks', 'server');
const { server } = require(serverPath);

(async () => {
  try {
    server.listen({ onUnhandledRequest: 'warn' });
    console.log('MSW server started');

    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: 'Bearer normal_token' },
        timeout: 5000,
      });

      const data = await (res.headers.get('content-type') || '').includes('application/json')
        ? res.json()
        : res.text();

      console.log('Request intercepted. Response status:', res.status);
      console.log('Response data:', data);
    } catch (err) {
      console.error('Request failed:', err && err.message ? err.message : err);
    }
  } catch (e) {
    console.error('Diagnostic error:', e);
  } finally {
    server.close();
    console.log('MSW server stopped');
    // Allow process to exit
    setTimeout(() => process.exit(0), 100);
  }
})();
