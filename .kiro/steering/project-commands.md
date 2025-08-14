---
inclusion: always
---

# Project Commands Reference

## Context

This steering file provides the EXACT commands for this React project to prevent wasted tool usage and broken workflows. Always use these commands instead of guessing.

## Build and Test Commands

### **Testing Commands (CRITICAL - Use These Exactly)**

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm test -- --watchAll=false

# Run tests with coverage
npm test -- --coverage --watchAll=false

# Run specific test file
npm test -- --testPathPattern=SortableWrapper.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should render"
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
npm test -- --watchAll=false
```
**Expected**: All tests pass

### **Gate 4: Code Quality**
```bash
npm run lint
npm run format:check
```
**Expected**: No linting or formatting errors

## Common Mistakes to Avoid

### **❌ NEVER Use These Commands:**
- `jest` (use `npm test` instead)
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

## Quick Reference Card

```bash
# The Big 4 Commands You'll Use Most:
npm test -- --watchAll=false    # Run tests
npm run build                   # Build project
npm run lint                    # Check code quality
npx tsc --noEmit               # Check TypeScript
```

**Remember: Always use npm, never yarn. Always use the scripts defined in package.json.**