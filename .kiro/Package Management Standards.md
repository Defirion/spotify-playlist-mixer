---
inclusion: always
---

# Package Management Standards

## Dependency Management
- Always use latest stable versions of packages when starting new projects
- Check for deprecation warnings during `npm install` and address immediately
- Run `npm audit` to identify and fix security vulnerabilities
- Prefer actively maintained packages over deprecated alternatives
- Use exact versions for critical dependencies, semver ranges for development tools

## TypeScript Project Requirements
- Maintain TypeScript version 5.x+ for latest language features
- Keep `@types/*` packages in sync with their corresponding runtime packages
- Use `ts-node-dev` for development with hot reloading
- Configure `tsconfig-paths` for clean import resolution

## Testing and Quality Standards
- Use Jest 29+ for testing framework
- Keep Supertest updated to v7+ (avoid deprecated v6.x)
- Maintain ESLint v9+ with flat config format
- Use TypeScript ESLint parser and plugin for code quality

## Security and Performance
- Address deprecated packages that cause memory leaks (e.g., `inflight`, old `rimraf`)
- Update packages with known security vulnerabilities immediately
- Use Helmet.js for Express security headers
- Implement rate limiting with express-rate-limit

## Database and Environment
- Use latest PostgreSQL client (`pg`) with proper connection pooling
- Validate environment variables with Joi schema validation
- Use Winston for structured logging with appropriate log levels
- Store sensitive configuration in `.env` files, never commit them

## Development Workflow
- Run `npm outdated` regularly to check for updates
- Test package updates in development before deploying
- Document any package version constraints and reasoning
- Use `npm ci` in production for reproducible builds