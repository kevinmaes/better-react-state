# Better React State - Rules Roadmap

This document tracks all implemented and planned rules for the better-react-state analyzer. It serves as both a historical record and a planning tool for future development.

## Rating Criteria

- **Commonality**: How frequently this pattern appears in React codebases (1-5, 5 being most common)
- **Priority**: Implementation priority considering effort, value, and strategic fit (1-5, 5 being highest)
- **ESLint Coverage**: Whether existing ESLint rules already address this pattern

## Rules Overview

### ✅ Implemented Rules

These rules are currently active in the analyzer (sorted by priority):

| Rule                            | Description                                                      | Commonality | Priority | ESLint Coverage | Docs                                                      |
| ------------------------------- | ---------------------------------------------------------------- | ----------- | -------- | --------------- | --------------------------------------------------------- |
| **Avoid State Contradictions**  | Detects multiple boolean states that create impossible UI states | 5           | 5        | ❌ None         | [📖](best-practices.md#avoid-state-contradictions)        |
| **Avoid Redundant State**       | Identifies state storing computed values that should be derived  | 4           | 5        | ❌ None         | [📖](best-practices.md#avoid-redundant-state)             |
| **Group Related State**         | Detects separate useState calls for related data                 | 4           | 5        | ❌ None         | [📖](best-practices.md#group-related-state)               |
| **Avoid State Duplication**     | Finds same data stored in multiple state variables               | 4           | 5        | ❌ None         | [📖](best-practices.md#avoid-state-duplication)           |
| **Prefer Explicit Transitions** | Suggests useReducer for complex multi-state updates              | 3           | 4        | ❌ None         | [📖](best-practices.md#prefer-explicit-state-transitions) |
| **Avoid Deeply Nested State**   | Warns about state objects nested >2 levels deep                  | 3           | 4        | ❌ None         | [📖](best-practices.md#avoid-deeply-nested-state)         |

### 🚧 Possible Future Rules

These rules are under consideration for future implementation (sorted by priority):

| Rule                        | Description                                                          | Commonality | Priority | ESLint Coverage                            | Notes                                             |
| --------------------------- | -------------------------------------------------------------------- | ----------- | -------- | ------------------------------------------ | ------------------------------------------------- |
| **Detect Prop Drilling**    | Identifies props passed through 2+ intermediate components unchanged | 5           | 5        | ❌ None                                    | Clear antipattern, suggest Context or composition |
| **State in useEffect**      | Detects setState calls in useEffect that indicate derived state      | 4           | 4        | ⚠️ `react-hooks/exhaustive-deps` (partial) | Often misunderstood, causes unnecessary renders   |
| **Server vs Client State**  | Identifies API data in useState instead of React Query/SWR           | 4           | 4        | ❌ None                                    | Major architectural improvement opportunity       |
| **State vs Refs**           | Detects state that doesn't affect render (should be refs)            | 3           | 3        | ❌ None                                    | Performance optimization                          |
| **Form State Patterns**     | Suggests form libraries or unified state for multi-field forms       | 5           | 3        | ❌ None                                    | Very common but lower impact                      |
| **State Machine Detection** | Enhanced version of "avoid contradictions" suggesting full FSM       | 3           | 3        | ❌ None                                    | High impact but requires deeper analysis          |
| **Global State Overuse**    | Context at root with state only used in subtrees                     | 3           | 3        | ❌ None                                    | Performance impact, architectural issue           |

## Implementation Strategy

### Phase 1: High-Value, Unique Rules (Priority 5)

Focus on rules that aren't covered by existing tools and provide clear value:

1. **Prop Drilling Detection** - Very common, no existing tooling
2. **State in useEffect** - Subtle bugs, often misunderstood

### Phase 2: Architecture & Performance (Priority 4)

Rules that guide better architectural decisions:

1. **Server vs Client State** - Push toward React Query/SWR adoption
2. **State in useEffect** - Better detection than exhaustive-deps for derived state

### Phase 3: Optimization & Polish (Priority 3)

Nice-to-have rules for code quality:

1. **State vs Refs** - Performance optimization
2. **Form State Patterns** - Developer experience
3. **State Machine Detection** - Advanced pattern recognition
4. **Global State Overuse** - Performance optimization

### Phase 4: Lower Priority (Priority 1)

Consider if there's strong user demand:

1. **State Update Batching** - Less relevant in modern React

## Success Metrics

- **Adoption**: Number of issues detected and fixed
- **False Positive Rate**: Keep below 10%
- **Developer Feedback**: Usefulness ratings
- **Performance**: Analysis speed on large codebases

## Future Considerations

### ESLint Plugin Development

Transform this analyzer into an ESLint plugin (`eslint-plugin-better-react-state`):

**Advantages:**

- Integrate into existing developer workflows
- Real-time feedback in IDEs
- Leverage ESLint's auto-fix infrastructure
- Shareable configs for teams
- Better adoption through familiar tooling

**Implementation Plan:**

1. Start with rules that have no ESLint equivalent (Priority 5 rules)
2. Provide better messages/suggestions than existing partial coverage
3. Bundle as `@better-react-state/eslint-plugin`
4. Maintain standalone CLI for project-wide analysis and reporting

**Target Rules for ESLint:**

- All 6 implemented rules (none have ESLint equivalents)
- Prop Drilling Detection (high value, no existing rule)
- State in useEffect (better than exhaustive-deps for this case)
- Server vs Client State (architectural guidance)

### Potential Auto-fix Support

Some rules could support automatic fixes:

- Group Related State (combine useState calls)
- Avoid Redundant State (remove state, add computation)
- State vs Refs (convert useState to useRef)
- Avoid State Contradictions (convert to single state variable)

### Framework-Specific Rules

Consider rules for:

- Next.js (client vs server state)
- Remix (loader data vs client state)
- React Native (performance-critical state patterns)

### Integration with XState

Since XState is already detected, consider:

- Suggesting XState for complex state logic
- XState-specific best practices
- Migration paths from useState/useReducer to XState

## Contributing

When proposing new rules, consider:

1. Is this a React state-specific issue?
2. Does it cause actual bugs or just style preferences?
3. Is it already well-covered by existing tools?
4. Can we provide actionable fix suggestions?
5. Will it have too many false positives?

## Changelog

### 2024-01

- Initial 6 rules implemented
- XState detection added
- JSON and Markdown output formats

### Future

- See planned rules above

---

_Last updated: 2024-01_
