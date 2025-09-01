# better-react-state

[![CI](https://github.com/kevinmaes/better-react-state/actions/workflows/ci.yml/badge.svg)](https://github.com/kevinmaes/better-react-state/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/better-react-state.svg)](https://www.npmjs.com/package/better-react-state)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A tool to analyze and fix React state management antipatterns.

## Installation

```bash
npm install -D better-react-state
# or
yarn add -D better-react-state
# or
pnpm add -D better-react-state
```

## Usage

```bash
# Analyze current directory
npx better-react-state

# Analyze specific directory
npx better-react-state ./src

# Custom file pattern
npx better-react-state --pattern "**/*.{js,jsx,ts,tsx}"

# Output as JSON
npx better-react-state --format json

# Strict mode (exit with error if issues found)
npx better-react-state --strict
```

## What it detects

Analyzes React components for 6 common state management antipatterns:

- **Group Related State** - Multiple `useState` calls that should be combined
- **Avoid State Contradictions** - Boolean states that create impossible UI states
- **Avoid Redundant State** - State that can be computed from existing state
- **Avoid Deeply Nested State** - State objects nested more than 2 levels deep
- **Avoid State Duplication** - Same data stored in multiple places
- **Prefer Explicit Transitions** - Implicit state changes that need reducer patterns

See [docs/best-practices.md](docs/best-practices.md) for detailed examples and explanations.

## Philosophy

This tool promotes:

- **Explicit over implicit** state changes
- **Type-safe** state transitions
- **Single source of truth** for data

See [docs/best-practices.md](docs/best-practices.md) for detailed explanations.

## Development

```bash
# Install dependencies
pnpm install

# Run in development
pnpm dev

# Build
pnpm build

# Run tests
pnpm test
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development workflow
- How to submit pull requests
- Adding changesets for your changes
- Code style guidelines

All contributions must include a changeset - run `pnpm changeset` to add one.

## License

MIT
