// Force CJS bundle of @mswjs/interceptors for Jest
module.exports = require(
  require.resolve('@mswjs/interceptors/lib/node/index.js')
);
