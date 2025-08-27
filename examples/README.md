# Fix React State - Examples

This directory contains example React applications with intentional state management antipatterns for testing and learning.

## Quick Start

### 1. Build the CLI tool

```bash
# From the project root
npm run build
```

### 2. Test on Examples

#### Option A: Use npm scripts

```bash
# Test all examples
npm run test:examples

# Test specific example
npm run test:todo-app
```

#### Option B: Run CLI directly

```bash
# From project root
node dist/cli.js examples/todo-app-antipatterns/src

# With different output formats
node dist/cli.js examples/todo-app-antipatterns/src --format json
node dist/cli.js examples/todo-app-antipatterns/src --format markdown

# Save output to file
node dist/cli.js examples/todo-app-antipatterns/src --format markdown > report.md
```

#### Option C: Use npx (after npm link)

```bash
# First, link the package locally
npm link

# Then use anywhere
npx fix-react-state examples/todo-app-antipatterns/src
fix-react-state examples/todo-app-antipatterns/src --format text
```

## Available Examples

### 1. Todo App with Antipatterns

- **Location**: `todo-app-antipatterns/`
- **Issues**: 30 violations across all 6 rule types
- **Purpose**: Comprehensive demonstration of what NOT to do

### 2. Shopping Cart (Coming Soon)

- **Location**: `shopping-cart-antipatterns/`
- **Issues**: Focus on state duplication and computed values
- **Purpose**: E-commerce specific patterns

### 3. Complex Form (Coming Soon)

- **Location**: `form-antipatterns/`
- **Issues**: Focus on form state management
- **Purpose**: Form-specific antipatterns

## CLI Options

```bash
fix-react-state [path] [options]

Options:
  -V, --version          output the version number
  -p, --pattern <glob>   File pattern to analyze (default: "**/*.{js,jsx,ts,tsx}")
  -i, --ignore <glob>    Patterns to ignore (default: ["node_modules/**","dist/**","build/**"])
  -f, --format <type>    Output format: text, json, markdown (default: "text")
  --fix                  Automatically fix issues where possible
  --strict               Exit with error code if issues found
  -h, --help            display help for command
```

## Understanding the Output

### Text Format (Default)

```
🔍 Analyzing React state patterns...

Found 30 issues in 4 files:

/path/to/file.tsx
  ❌ [error] Message
  ⚠️  [warning] Message
  ℹ️  [info] Message
```

### JSON Format

```json
{
  "filesAnalyzed": 4,
  "issues": [...],
  "stats": {
    "errors": 2,
    "warnings": 23,
    "info": 5,
    "byRule": {...}
  }
}
```

### Markdown Format

Creates a formatted report suitable for documentation or GitHub issues.

## Resetting Examples

If you modify an example and want to reset it:

```bash
# Check what changed
git status examples/

# Reset specific example
git checkout examples/todo-app-antipatterns/

# Reset all examples
git checkout examples/
```

## Creating Your Own Test Files

You can create your own test files:

```bash
# Create a test file
echo 'import React, { useState } from "react";

export function TestComponent() {
  // Add your antipatterns here
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  return <div>{firstName} {lastName}</div>;
}' > test-component.tsx

# Analyze it
node dist/cli.js test-component.tsx
```

## Tips

1. **Pipe to less for long output**: `fix-react-state src | less`
2. **Save JSON for processing**: `fix-react-state src -f json > report.json`
3. **Use in CI**: `fix-react-state src --strict` (exits with code 1 if issues found)
4. **Filter specific rules**: Use grep, e.g., `fix-react-state src | grep "group-related"`
