---
inclusion: always
---

# Project Commands Reference

## Context

This steering file provides the EXACT commands for this React project to prevent wasted tool usage and broken workflows. Always use these commands instead of guessing.

## Build and Test Commands

### **Testing Commands (CRITICAL - Use These Exactly)**

```bash
# Run all tests (explicit runner — preferred for CI and deterministic environment)
npx jest --env=jsdom --no-cache

# Run tests in watch mode (for development)
npx jest --env=jsdom --watchAll=false

# Run tests with coverage
npx jest --env=jsdom --coverage --no-cache

# Run specific test file
npx jest --env=jsdom --testPathPattern=SortableWrapper.test.tsx --no-cache

# Run tests matching pattern
npx jest --env=jsdom --testNamePattern="should render" --no-cache
```

### **Build Commands**

```bash
# Development build and start
npm start

# Production build
npm run build

# TypeScript type checking (NO COMPILATION)
npx tsc --noEmit
```

### **Code Quality Commands**

```bash
# Lint check
npm run lint

# Lint and fix
npm run lint:fix

# Format check
npm run format:check

# Format and fix
npm run format
```

## Project Structure

### **Technology Stack**
- **React 18.3.1** with TypeScript 4.9.5
- **Create React App** with react-scripts 5.0.1
- **Testing**: Jest + React Testing Library
- **State Management**: Zustand 5.0.7
- **Linting**: ESLint + Prettier
- **Pre-commit**: Husky + lint-staged

### **Test Framework Details**
- **Test Runner**: Jest (via react-scripts)
- **Testing Library**: @testing-library/react 16.3.0
- **DOM Testing**: @testing-library/jest-dom 6.6.3
- **User Events**: @testing-library/user-event 14.6.1

## Task Completion Gate Commands

### **Gate 1: TypeScript Compilation**
```bash
npx tsc --noEmit
```
**Expected**: Zero TypeScript errors

### **Gate 2: Build Success**
```bash
npm run build
```
**Expected**: Build completes successfully

### **Gate 3: Test Success**
```bash
# Preferred: explicit Jest runner to ensure jsdom environment and fresh runs
npx jest --env=jsdom --no-cache
```
**Expected**: All tests pass

### **Gate 4: Code Quality (Pre-commit Ready)**
```bash
npm run lint:fix                # Auto-fix what can be fixed
npm run lint                    # Check remaining issues
npm run format:check            # Check formatting
```
**Expected**: No linting or formatting errors (pre-commit hooks will pass)

## Common Mistakes to Avoid

### **❌ NEVER Use These Commands:**
- `tsc` for building (use `npm run build` instead)
- `eslint` directly (use `npm run lint` instead)
- `prettier` directly (use `npm run format` instead)

### **❌ NEVER Use These Patterns:**
- `npm run test` (correct: `npm test`)
- `yarn` commands (this project uses npm)
- Direct jest CLI commands
- Manual TypeScript compilation for building



## Development Workflow

### **During Task Implementation:**
```bash
npm test -- --watchAll=false   # Run tests
npx tsc --noEmit               # Check TypeScript
```

### **Before Task Completion:**
```bash
npm run lint                    # Check code quality
npm test -- --watchAll=false   # Run tests
npm run build                   # Verify build
npx tsc --noEmit               # Check TypeScript
```

## File Size Checking

### **Check Line Count:**
```bash
# Windows (PowerShell)
Get-Content filename.ts | Measure-Object -Line

# Windows (CMD)
find /c /v "" filename.ts
```



## Project-Specific Notes

- **React Scripts Version**: 5.0.1 (handles Jest configuration)
- **TypeScript Version**: 4.9.5 (not latest, but stable for this project)
- **Jest Configuration**: Defined in package.json, not separate config file
- **ESLint Configuration**: Extends react-app and prettier configs
- **Husky**: Manages pre-commit hooks automatically

## Pre-commit Hook Management

### **During dnd-kit Migration (Tasks 0-17)**

The project uses Husky + lint-staged for pre-commit hooks. During the drag system migration, some test files may have ESLint errors that block commits.

### **Pre-commit Error Resolution Strategy:**

```bash
# 1. Check what's failing
npm run lint

# 2. Try auto-fix first
npm run lint:fix

# 3. If auto-fix doesn't work, manually fix the specific errors
# Focus on these common issues during migration:
# - Unused variables in test files
# - Missing imports in legacy test files
# - Undefined components in skipped tests
```

### **Common Migration-Related ESLint Errors:**

1. **Unused Variables in Tests** (`@typescript-eslint/no-unused-vars`)
   - Remove unused imports/variables from test files
   - Or add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` above the line

2. **Undefined Components** (`react/jsx-no-undef`)
   - Usually in skipped drag tests that reference moved components
   - Either import from legacy path or skip the entire test file

3. **Restricted Globals** (`no-restricted-globals`)
   - Usually `screen` usage in test files
   - Import `screen` from `@testing-library/react`

### **Emergency Pre-commit Bypass (Use Sparingly):**
```bash
# Only use if you need to commit during migration and can't fix ESLint errors immediately
git commit --no-verify -m "WIP: dnd-kit migration task X"
```

### **Preferred Approach:**
```bash
# Always try to fix ESLint errors before committing
npm run lint:fix
git add .
git commit -m "Complete dnd-kit migration task X"
```

## Quick Reference Card

```bash
# The Big 5 Commands You'll Use Most:
npx jest --env=jsdom --no-cache    # Run tests (preferred explicit runner)
npm run build                      # Build project
npm run lint                       # Check code quality
npm run lint:fix                   # Fix linting issues
npx tsc --noEmit                   # Check TypeScript
```

**Remember: Always use npm, never yarn. Always use the scripts defined in package.json.**