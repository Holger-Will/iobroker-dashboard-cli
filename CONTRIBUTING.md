# Contributing to ioBroker Dashboard CLI

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git

### Initial Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/iobroker-dashboard-cli.git
   cd iobroker-dashboard-cli
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run tests to ensure everything works:
   ```bash
   npm test
   ```

## Development Workflow

### Test-Driven Development (TDD)

This project follows strict Test-Driven Development practices:

1. **Write tests first** - Before implementing any feature, write tests that describe the expected behavior
2. **Red** - Run tests and see them fail
3. **Green** - Write minimal code to make tests pass
4. **Refactor** - Improve code while keeping tests green
5. **Commit** - Only commit when all tests pass

### Command Summary

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:visual        # Visual regression tests

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Visual regression test management
npm run test:visual:update # Update baselines
npm run test:visual:diff   # Show differences
```

## Code Style and Quality

### Project Structure

```
├── commands/              # Command implementations
├── test/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── visual/           # Visual regression tests
│   └── helpers/          # Test utilities
├── *_SPEC.md             # Feature specifications
└── CLAUDE.md             # Claude Code instructions
```

### Coding Standards

- **ES Modules**: Use `import`/`export` syntax (project is `"type": "module"`)
- **Test Coverage**: Maintain high test coverage (aim for >90%)
- **Documentation**: Update relevant spec files for new features
- **CLAUDE.md**: Update project instructions for Claude Code

### Git Workflow

1. Create a feature branch from `master`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make changes following TDD workflow

3. Commit with descriptive messages:
   ```bash
   git commit -m "feat: add dashboard element validation
   
   - Add input validation for element types
   - Include comprehensive error messages
   - Add unit tests for validation logic
   
   🤖 Generated with Claude Code
   
   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

4. Push and create Pull Request

## Testing Guidelines

### Test Categories

1. **Unit Tests** (`test/unit/`)
   - Test individual functions/classes in isolation
   - Use mocks for external dependencies
   - Fast execution (< 100ms per test)

2. **Integration Tests** (`test/integration/`)
   - Test component interactions
   - May use real file system or network
   - Longer execution acceptable

3. **Visual Regression Tests** (`test/visual/`)
   - Test terminal output consistency
   - Compare against baseline files
   - Update baselines when UI changes

### Writing Good Tests

```javascript
// Good test structure
describe('FeatureName', function() {
    let instance;
    
    beforeEach(function() {
        instance = new FeatureName();
    });
    
    describe('specific functionality', function() {
        it('should do specific thing when condition met', function() {
            // Arrange
            const input = 'test data';
            
            // Act
            const result = instance.method(input);
            
            // Assert
            expect(result).to.equal('expected output');
        });
    });
});
```

### Test Requirements

- All new features must have tests
- Bug fixes must include regression tests
- Tests must be deterministic (no flaky tests)
- Use descriptive test names
- Include both positive and negative test cases

## AI Local Tools Development

When adding new AI local tools:

1. **Define schema** in `local-tools.js`:
   ```javascript
   this.tools.set('tool_name', {
       schema: {
           name: 'tool_name',
           description: 'Clear description of what tool does',
           input_schema: {
               type: 'object',
               properties: { /* define inputs */ },
               required: ['required_field']
           }
       },
       handler: this.handleToolName.bind(this)
   });
   ```

2. **Implement handler** with proper error handling

3. **Add comprehensive tests** in `test/unit/core/local-tools.test.js`

4. **Update AI service** system prompt if needed

## Visual Elements Development

When creating new visual elements:

1. **Follow existing patterns** (see `VisualSliderElement`)
2. **Include theme support**
3. **Add keyboard navigation**
4. **Test responsive behavior**
5. **Include accessibility considerations**

## Pull Request Process

1. **Ensure all tests pass**: `npm test`
2. **Update documentation** if needed
3. **Follow PR template** (auto-populated)
4. **Request review** from maintainers
5. **Address feedback** promptly

### PR Checklist

- [ ] All tests pass locally
- [ ] New features have tests
- [ ] Documentation updated
- [ ] CLAUDE.md updated if needed
- [ ] Visual regression tests updated
- [ ] No breaking changes (or properly documented)

## Release Process

Releases are automated via GitHub Actions:

1. **Create release tag**: `git tag v1.2.3`
2. **Push tag**: `git push origin v1.2.3`
3. **GitHub Actions** handles the rest:
   - Runs full test suite
   - Creates GitHub release
   - Publishes to npm (if configured)

## Getting Help

- **Documentation**: Check existing spec files (`*_SPEC.md`)
- **Issues**: Create GitHub issue with appropriate template
- **Discussions**: Use GitHub Discussions for questions
- **Code Review**: Ask for help in PR comments

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow TDD practices
- Maintain code quality standards

## Common Issues and Solutions

### Test Failures

1. **Visual regression failures**: Check if UI changes are intentional, update baselines if needed
2. **Flaky tests**: Investigate timing issues, add proper waits
3. **Module import errors**: Ensure proper ES module syntax

### Development Environment

1. **Node version issues**: Use Node.js 18+ 
2. **npm audit warnings**: Address security vulnerabilities promptly
3. **Test coverage drops**: Add tests for new code

## Performance Considerations

- Keep CLI startup time fast (< 2 seconds)
- Minimize dependencies
- Use lazy loading for heavy modules
- Profile memory usage for long-running operations

Thank you for contributing to ioBroker Dashboard CLI! 🚀