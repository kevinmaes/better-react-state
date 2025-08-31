# Contributing to React State Patterns

Thank you for your interest in contributing to React State Patterns! This guide will help you get started with contributing to the project.

## Development Workflow

This project uses a structured release workflow:

1. **Development Branch (`dev`)**: All feature development happens here
2. **Main Branch (`main`)**: Stable releases only
3. **Automated Releases**: Version bumps and NPM publishing are automated

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/react-state-patterns.git`
3. Install dependencies: `pnpm install`
4. Create a feature branch from `dev`: `git checkout -b feature/your-feature dev`

## Making Changes

### Development Commands

```bash
# Run the CLI in development mode
pnpm dev

# Run tests
pnpm test
pnpm test:watch

# Run linting
pnpm lint
pnpm lint:fix

# Type checking
pnpm typecheck

# Format code
pnpm format

# Build the project
pnpm build
```

### Adding a Changeset

**Every PR must include a changeset** that describes what changed and why. Changesets help us:

- Automatically version the package
- Generate meaningful changelogs
- Communicate changes to users

To add a changeset:

```bash
pnpm changeset
```

This will prompt you to:

1. Select the type of change (patch/minor/major)
2. Write a summary of your changes

#### Version Types

- **Patch**: Bug fixes and minor updates (0.0.X)
- **Minor**: New features that are backwards compatible (0.X.0)
- **Major**: Breaking changes (X.0.0)

#### Example Changeset

```markdown
---
'react-state-patterns': minor
---

Add support for detecting XState patterns in React components
```

### Commit Messages

We don't enforce a strict commit format, but please write clear, descriptive commit messages:

- First line: Brief summary (50 chars or less)
- Optional body: Detailed explanation if needed

## Submitting a Pull Request

1. Ensure all tests pass: `pnpm test`
2. Run linting: `pnpm lint`
3. Run type checking: `pnpm typecheck`
4. Format your code: `pnpm format`
5. Add a changeset: `pnpm changeset`
6. Push your branch to your fork
7. Create a PR targeting the `dev` branch
8. Fill out the PR template completely

## Pull Request Guidelines

- PRs should target the `dev` branch (never `main` directly)
- Include a clear description of changes
- Reference any related issues
- Ensure all CI checks pass
- Must include a changeset file

## Release Process

Releases are automated through GitHub Actions:

1. When changes are merged to `dev`, a "Version Packages" PR is automatically created/updated
2. This PR accumulates all changesets and updates versions/changelogs
3. When the Version PR is merged to `main`, the package is automatically published to NPM
4. GitHub releases are created automatically with changelogs

## Code Style

- TypeScript for all code
- Functional programming patterns preferred
- Named exports only (no default exports)
- File naming: kebab-case
- Comprehensive tests for new features

## Testing

- Unit tests use Vitest
- Test files are co-located with source files
- Follow AAA pattern: Arrange, Act, Assert
- Aim for high coverage on new code

## Questions?

Feel free to:

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Reach out to maintainers for guidance

Thank you for contributing!
