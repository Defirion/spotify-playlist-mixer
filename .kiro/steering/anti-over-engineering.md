# Anti-Over-Engineering Guidelines

## Core Principle: KISS (Keep It Simple, Stupid)

You have a chronic tendency to over-engineer solutions. This steering file exists to prevent that pattern.

## Mandatory Pre-Implementation Checklist

Before writing ANY code, you MUST:

1. **Read the existing code first** - Understand what's already there before adding anything
2. **Check for existing tests** - Run them and make sure they pass before making changes
3. **Start with the absolute minimum** - Write the smallest possible implementation first
4. **One feature at a time** - Don't add multiple features in one go

## Forbidden Patterns

### ❌ NEVER DO THESE:

- **Extensive error handling** - Basic try-catch only, no complex recovery systems
- **Defensive programming** - Don't validate every parameter extensively
- **Complex state management** - Use simple useState or minimal Zustand slices, avoid complex state objects
- **Abstraction layers** - Work directly with DOM/APIs, no unnecessary wrappers
- **Comprehensive logging** - Console.error for actual errors only
- **Future-proofing** - Don't add features "just in case"
- **Complex coordination** - Avoid systems that coordinate between multiple parts
- **Extensive validation** - Basic checks only, trust the inputs
- **Multiple design patterns** - Pick one simple approach and stick to it

### ❌ Code Smells to Avoid:

- Functions longer than 45 lines (35-40 is target, accounting for Prettier formatting)
- More than 3 levels of nesting
- Complex conditional logic
- Multiple useState hooks for related data
- setTimeout for state updates
- Custom event systems
- Extensive type definitions
- Helper functions that are only used once

## Required Patterns

### ✅ ALWAYS DO THESE:

- **Start minimal** - Get basic functionality working first
- **Use existing hooks** - Leverage what's already there
- **Direct DOM manipulation** - Use native APIs directly
- **Simple state** - One useState or minimal Zustand slice with basic state
- **Immediate feedback** - Update UI directly, no delays
- **Test-driven** - Make existing tests pass before adding features
- **Incremental** - Add one small feature at a time

### ✅ Code Quality Standards:

- Maximum 200 lines per file (accounting for Prettier formatting with 80-char width)
- Target 35 lines per function (up to 45 acceptable with proper error handling)
- Maximum 2 levels of nesting
- Use existing utilities before creating new ones
- Direct API calls over abstraction layers
- Simple boolean flags over complex state machines

## Implementation Process

### Step 1: Understand What Exists
- Read all related files completely
- Run existing tests to see current state
- Identify what's already working
- Find the minimal change needed

### Step 2: Write Minimal Implementation
- Start with the simplest possible solution
- Use existing patterns from the codebase
- Don't add error handling until basic functionality works
- Don't add edge case handling initially

### Step 3: Make Tests Pass
- Run tests after every small change
- Fix failing tests immediately
- Don't add new features until all tests pass
- If tests are complex, simplify them too

### Step 4: Iterate Carefully
- Add ONE small improvement at a time
- Test after each change
- Stop when requirements are met
- Resist the urge to "improve" working code

## Test-First Mentality

- **Run tests before making changes** - Understand the current state
- **Make tests pass incrementally** - Don't break working functionality
- **Add tests for new features only after basic implementation works**
- **Keep tests simple** - Test behavior, not implementation details
- **Fix failing tests immediately** - Don't accumulate technical debt

## CRITICAL: Never Mark Tasks Complete with Failing Tests

### The Fatal Pattern You Must Avoid:
1. Create new tests for a feature
2. Tests fail because implementation is incomplete
3. Mark task as complete anyway
4. Move on leaving broken tests behind

### The Correct Pattern:
1. Write minimal implementation first
2. Create simple tests that should pass
3. **RUN THE TESTS** - they must pass
4. If tests fail, fix implementation immediately
5. Only mark task complete when ALL tests pass
6. Never leave failing tests behind

## When You Feel the Urge to Over-Engineer

### Stop and Ask:
1. Is this the absolute minimum needed to meet the requirement?
2. Am I adding complexity that wasn't asked for?
3. Will this make the code harder to understand?
4. Am I solving problems that don't exist yet?
5. Are the existing tests still passing?

### If Yes to Any Above:
- **STOP** - Step back and simplify
- **Remove** unnecessary complexity
- **Focus** on the core requirement only
- **Test** that basic functionality works

## Success Metrics

- **Code length**: Implementations should be under 200 lines (accounting for Prettier formatting)
- **Test success**: All existing tests must pass
- **Functionality**: Core requirements work reliably
- **Simplicity**: Code is easy to read and understand
- **Maintainability**: Changes are easy to make

## Emergency Brake

If you catch yourself:
- Writing more than 250 lines of code (accounting for Prettier formatting)
- Adding complex error handling
- Creating coordination systems
- Writing extensive validation
- Adding "just in case" features
- **Creating tests that fail and marking tasks complete anyway**
- **Skipping any of the Task Completion Gates**

**IMMEDIATELY STOP** and start over with a simpler approach.

## Complexity Warning Signs

**STOP immediately and restart with simpler approach if you notice:**
- More than 3 nested if statements in a single function
- More than 2 setTimeout calls in a single file
- More than 1 useEffect hook in a single component
- Importing more than 5 external dependencies in a single file
- Writing a function description longer than 2 sentences
- Looking at legacy code for "inspiration" on how to implement something

## Legacy Code Resistance

**Legacy code is for understanding WHAT was done, never HOW to do it.**

- Legacy code shows the problems we're trying to avoid
- If you find yourself looking at legacy code for implementation ideas, STOP
- Re-read the requirements and design instead
- Build from first principles, not from old patterns
- The old code is complex because it grew organically - don't repeat those patterns

## Task Execution Safety Pattern

For every task, follow this pattern:
1. **Define Purpose**: Write a 2-sentence description of what this file should do
2. **Verify Prerequisites**: Check dependencies exist and work
3. **Implement Minimally**: Start with simplest version that could work
4. **Test Immediately**: Run relevant tests after implementation
5. **Pass All Gates**: Ensure TypeScript, build, tests, and size limits all pass
6. **Only Then Complete**: Mark task complete only after all gates pass

**Purpose Definition Rule**: If your 2-sentence description is longer than 2 sentences, the scope is too broad - simplify first.

This pattern prevents the common failure modes of incomplete implementations, broken builds, and failing tests.

## Task Completion Gates

**NEVER mark a task complete unless ALL gates pass:**

### Gate 1: TypeScript Compilation
1. Run `tsc --noEmit` or `npm run type-check`
2. Zero TypeScript errors allowed
3. Fix all type issues immediately

### Gate 2: Build Success
1. Run `npm run build`
2. Build must complete successfully
3. Fix any build errors immediately

### Gate 3: Test Success
1. Run `npm test` or relevant test command
2. ALL tests must pass (existing + new)
3. Fix failing tests immediately
4. Never leave failing tests behind

### Gate 4: File Size Limits
1. Check file size against task limits
2. If approaching limit, split functionality
3. Use `wc -l filename` to verify

### Gate 5: Pre-commit Quality Check
1. Run `npm run lint:fix` to auto-fix issues
2. Run `npm run lint` - zero errors allowed (warnings are acceptable)
3. Run `npm run format:check` - must pass
4. Pre-commit hooks must pass (test with `git add . && git commit --dry-run`)

### Gate 6: Function Size Check
1. No function over 45 lines (target: 35-40, accounting for Prettier formatting)
2. If over 45 lines, split or simplify
3. Event handlers get slight leeway for related event handling

**No exceptions. All gates must pass before marking complete.**

## Remember

The user has repeatedly seen you over-engineer solutions. They want:
- **Working code** over perfect code
- **Simple solutions** over comprehensive ones
- **Existing patterns** over new abstractions
- **Passing tests** over feature completeness

Your job is to make the minimum change needed to meet the requirement and make tests pass. Nothing more.