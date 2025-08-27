# fix-react-state

[![CI](https://github.com/kevinmaes/fix-react-state/actions/workflows/ci.yml/badge.svg)](https://github.com/kevinmaes/fix-react-state/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/fix-react-state.svg)](https://www.npmjs.com/package/fix-react-state)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A tool to analyze and fix React state management antipatterns.

## Installation

```bash
npm install -D fix-react-state
# or
yarn add -D fix-react-state
# or
pnpm add -D fix-react-state
```

## Usage

```bash
# Analyze current directory
npx fix-react-state

# Analyze specific directory
npx fix-react-state ./src

# Custom file pattern
npx fix-react-state --pattern "**/*.{js,jsx,ts,tsx}"

# Output as JSON
npx fix-react-state --format json

# Strict mode (exit with error if issues found)
npx fix-react-state --strict
```

## What it detects

### 1. Group Related State

Detects multiple `useState` calls that should be combined into a single state object.

```javascript
// ❌ Bad
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [phone, setPhone] = useState('');

// ✅ Good
const [user, setUser] = useState({
  name: '',
  email: '',
  phone: '',
});
```

### 2. Avoid State Contradictions

Identifies boolean states that can create impossible UI states.

```javascript
// ❌ Bad
const [isLoading, setIsLoading] = useState(false);
const [hasError, setHasError] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);

// ✅ Good
const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
```

### 3. Avoid Redundant State

Finds state that can be computed from existing state.

```javascript
// ❌ Bad
const [items, setItems] = useState([]);
const [itemCount, setItemCount] = useState(0);

// ✅ Good
const [items, setItems] = useState([]);
const itemCount = items.length; // Computed during render
```

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

## License

MIT
