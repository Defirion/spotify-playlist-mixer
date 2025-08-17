Babel migration considerations

This document explains the two-level approach to Babel in this repository and outlines a future path to a full custom Babel/webpack/Jest migration if desired.

Overview
- Current setup: Create React App (`react-scripts`) provides the default build and test toolchain. CRA includes a Babel-based transform for tests and the development build, which is why TypeScript and JSX tests run without ts-jest.
- Goal of the minimal change: Add an explicit `jest.config.js` and a few devDependencies so running `jest` directly or running tests in CI behaves deterministically without ejecting CRA.

Why consider a full Babel migration?
- Pros
  - Full control over build and test transforms.
  - Ability to use the latest Babel plugins and custom transforms not supported by CRA.
  - Potentially faster test iteration for advanced setups (if optimized correctly).
  - Easier handling of edge-case ESM/node_modules packages that need transformation.

- Cons
  - High migration cost: must replace `react-scripts` (ejecting or removing it) and recreate the dev server, build, and test configs.
  - Maintenance overhead: you must maintain your own webpack/babel configs and keep them up-to-date.
  - Risk of regressions: styles, asset handling, environment variables, and other CRA conveniences must be reproduced.

Recommended incremental path
1. Minimal step (already applied): Keep CRA for builds and dev. Add `jest.config.js`, `identity-obj-proxy`, and `file` mocks to make `jest` runs consistent outside CRA. This is low-risk and reversible.
2. If more control is required later: Phase out `react-scripts` by introducing a custom Babel + Webpack + Jest setup. Extract the CRA behavior incrementally, testing at each step.

Commands to migrate (if you choose full migration later)
- Remove react-scripts
  npm remove react-scripts
- Add custom tooling
  npm install --save-dev webpack webpack-cli webpack-dev-server babel-loader @babel/core @babel/preset-env @babel/preset-react @babel/preset-typescript babel-jest jest identity-obj-proxy css-loader style-loader
- Create `webpack.config.js`, `.babelrc`, `jest.config.js` and move environment handling into the new pipeline.

Notes
- For most projects, the minimal approach yields the best ROI: deterministic tests in CI without the cost of a full migration.
- Keep running `npx tsc --noEmit` on CI to ensure type safety even when Babel handles transforms during tests.
