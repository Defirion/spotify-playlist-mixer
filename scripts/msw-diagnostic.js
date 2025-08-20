// Diagnostic script: start MSW server and perform a request to verify interception
const axios = require('axios');
const path = require('path');
// Resolve to the source mocks server (tests `require('../mocks/server')` from src/test-utils)
const serverPath = path.resolve(__dirname, '..', 'src', 'mocks', 'server');
const { server } = require(serverPath);

(async () => {
  try {
    server.listen({ onUnhandledRequest: 'warn' });
    console.log('MSW server started');

    try {
      // Use node http adapter
      try {
        const httpAdapter = require('axios/lib/adapters/http');
        axios.defaults.adapter = (httpAdapter && httpAdapter.default) || httpAdapter;
      } catch (e) {
        // ignore
      }

      const res = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: 'Bearer normal_token' },
        timeout: 5000,
      });
      console.log('Request intercepted. Response status:', res.status);
      console.log('Response data:', res.data);
    } catch (err) {
      console.error('Request failed:', err && err.message ? err.message : err);
      if (err && err.response) {
        console.error('Response status:', err.response.status);
      }
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
