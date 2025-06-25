---
name: Test failure
about: Report a failing test case
title: '[TEST] '
labels: ['test-failure', 'needs-investigation']
assignees: ''
---

## Test Failure Description

Clear description of which test is failing and why.

## Failing Test

- **Test file**: `test/path/to/failing-test.js`
- **Test name**: "should do something specific"
- **Test category**: [unit/integration/visual regression]

## Error Output

```
Paste the complete error output here, including stack trace
```

## Environment

- OS: [e.g. Ubuntu 22.04, Windows 11, macOS 13]
- Node.js version: [e.g. 20.10.0]
- npm version: [e.g. 10.2.3]
- Test runner: Mocha
- CI/Local: [where did the failure occur?]

## Reproduction Steps

1. Clone the repository
2. Run `npm install`
3. Run `npm test` or specific test command
4. See failure

## Expected vs Actual

**Expected**: Test should pass
**Actual**: Test fails with error message

## Recent Changes

Have there been any recent changes that might have caused this?

- [ ] Code changes in the tested module
- [ ] Dependency updates
- [ ] Configuration changes
- [ ] Test infrastructure changes

## Intermittent or Consistent

- [ ] Fails consistently
- [ ] Fails intermittently
- [ ] Fails only in CI
- [ ] Fails only locally
- [ ] Fails only on specific OS

## Additional Context

Add any other context about the test failure here.

## Suggested Fix

If you have ideas on how to fix the failing test, please share them here.