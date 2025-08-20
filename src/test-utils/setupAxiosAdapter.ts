// Centralized axios adapter setup for Node-based Jest tests using MSW.
// Import (require) this once near test setup before creating axios instances.
// It ensures axios uses the Node http adapter so MSW can intercept requests.

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const axios = require('axios');
  if (axios && axios.defaults) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const httpAdapter = require('axios/lib/adapters/http');
      const resolved = (httpAdapter && httpAdapter.default) || httpAdapter;
      if (resolved && axios.defaults.adapter !== resolved) {
        axios.defaults.adapter = resolved;
      }
    } catch (e) {
      // ignore if adapter cannot be required (could be browser-like env)
    }
  }
} catch (e) {
  // axios not installed or unexpected shape; ignore silently
}

export {}; // side-effect module only
