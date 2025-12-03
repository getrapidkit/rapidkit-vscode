# Contributing to RapidKit VS Code Extension

Thank you for your interest in contributing to RapidKit! This document provides guidelines and instructions for contributing.

## 🤝 Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Visual Studio Code
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/getrapidkit/rapidkit-vscode.git
   cd rapidkit-vscode
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Open in VS Code**
   ```bash
   code .
   ```

4. **Run the extension**
   - Press `F5` to open Extension Development Host
   - Test your changes in the new window

## 📁 Project Structure

```
rapidkit-vscode/
├── src/
│   ├── commands/          # Command implementations
│   ├── core/              # Core services (config, detector)
│   ├── providers/         # IntelliSense providers
│   ├── ui/                # UI components (tree views, panels)
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   └── extension.ts       # Extension entry point
├── snippets/              # Code snippets (Python, TS, YAML)
├── schemas/               # JSON schemas for validation
├── media/                 # Icons and images
├── package.json           # Extension manifest
└── tsconfig.json          # TypeScript configuration
```

## 🔧 Development Workflow

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow TypeScript best practices
   - Add JSDoc comments for public APIs
   - Update tests if needed

3. **Test your changes**
   ```bash
   npm test
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git commit -m "feat: add new feature"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes
   - `refactor:` - Code refactoring
   - `test:` - Test additions/changes
   - `chore:` - Build/tooling changes

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Testing

Run tests before submitting PR:

```bash
# Lint code
npm run lint

# Run tests
npm test

# Test compilation
npm run compile
```

### Debugging

1. Set breakpoints in VS Code
2. Press `F5` to launch Extension Development Host
3. Trigger the feature you're debugging
4. Inspect variables and step through code

## 📝 Code Style

### TypeScript Guidelines

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use explicit types for function parameters and return values
- Use async/await over promises
- Add JSDoc comments for exported functions

Example:
```typescript
/**
 * Creates a new RapidKit project
 * @param name - Project name
 * @param framework - Framework type (fastapi or nestjs)
 * @returns Promise resolving to project path
 */
export async function createProject(
  name: string,
  framework: Framework
): Promise<string> {
  // Implementation
}
```

### VS Code API Usage

- Use `vscode.window.showInformationMessage` for user messages
- Use `vscode.window.withProgress` for long-running operations
- Dispose resources properly (add to `context.subscriptions`)
- Use proper VS Code icons (`$(icon-name)`)

### Error Handling

Always handle errors gracefully:

```typescript
try {
  await someOperation();
  vscode.window.showInformationMessage('Success!');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  vscode.window.showErrorMessage(`Failed: ${message}`);
  Logger.getInstance().error('Operation failed', error);
}
```

## 🎨 UI Guidelines

### Tree Views

- Use appropriate icons from VS Code icon library
- Provide context menus for actions
- Show loading states
- Handle empty states

### Webviews

- Use VS Code theme CSS variables
- Make responsive
- Handle message passing properly
- Clean up resources on dispose

### Commands

- Use clear, descriptive names
- Show progress for long operations
- Provide meaningful error messages
- Add to Command Palette with category

## 📚 Documentation

Update documentation when:

- Adding new features
- Changing existing behavior
- Adding configuration options
- Adding commands or shortcuts

Update these files:
- `README.md` - Main documentation
- `CHANGELOG.md` - Version history
- Code comments - Inline documentation

## 🧪 Testing Guidelines

### Unit Tests

Test individual functions:

```typescript
import { describe, it, expect } from '@jest/globals';
import { myFunction } from '../myFunction';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Integration Tests

Test VS Code API integration:

```typescript
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Extension Test Suite', () => {
  test('Command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('rapidkit.createWorkspace'));
  });
});
```

## 🐛 Bug Reports

When reporting bugs, include:

1. **Description** - Clear description of the issue
2. **Steps to Reproduce** - Detailed steps
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happens
5. **Environment**:
   - VS Code version
   - Extension version
   - OS and version
   - Node.js version
   - Python version (if relevant)
6. **Logs** - Output from RapidKit output channel
7. **Screenshots** - If applicable

## ✨ Feature Requests

When requesting features:

1. **Use Case** - Explain the problem/need
2. **Proposed Solution** - How it should work
3. **Alternatives** - Other solutions considered
4. **Additional Context** - Screenshots, mockups, etc.

## 🔍 Code Review

PRs will be reviewed for:

- **Functionality** - Does it work as expected?
- **Code Quality** - Is it well-written and maintainable?
- **Tests** - Are there appropriate tests?
- **Documentation** - Is it properly documented?
- **Performance** - Is it efficient?
- **Security** - Are there security concerns?

## 📦 Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag
4. Push to GitHub
5. Publish to VS Code Marketplace

## 📞 Getting Help

- **Discord**: [Join our server](https://discord.gg/rapidkit)
- **GitHub Discussions**: [Ask questions](https://github.com/getrapidkit/rapidkit-vscode/discussions)
- **Email**: dev@getrapidkit.com

## 🙏 Thank You

Thank you for contributing to RapidKit! Your efforts help make this tool better for everyone.

---

**Happy Coding!** 🚀
