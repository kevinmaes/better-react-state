# Better React State - Roadmap

Static analysis tool for identifying React state management antipatterns and promoting best practices.

## ✅ Implemented Rules

| Rule                            | Description                                          | Priority | Docs                                                      |
| ------------------------------- | ---------------------------------------------------- | -------- | --------------------------------------------------------- |
| **Avoid State Contradictions**  | Detects multiple booleans creating impossible states | High     | [📖](best-practices.md#avoid-state-contradictions)        |
| **Avoid Redundant State**       | Identifies state that should be derived              | High     | [📖](best-practices.md#avoid-redundant-state)             |
| **Group Related State**         | Detects separate useState for related data           | High     | [📖](best-practices.md#group-related-state)               |
| **Avoid State Duplication**     | Finds data stored in multiple state variables        | High     | [📖](best-practices.md#avoid-state-duplication)           |
| **Detect State in useEffect**   | setState in useEffect indicating derived state       | High     | [📖](best-practices.md#detect-state-in-useeffect)         |
| **Detect Prop Drilling**        | Props passed through 2+ components unchanged         | High     | [📖](best-practices.md#detect-prop-drilling)              |
| **Server vs Client State**      | API data in useState vs React Query/SWR              | High     | [📖](best-practices.md#server-vs-client-state)            |
| **Prefer Explicit Transitions** | Suggests useReducer for complex updates              | Medium   | [📖](best-practices.md#prefer-explicit-state-transitions) |
| **Avoid Deeply Nested State**   | Warns about state nested >2 levels                   | Medium   | [📖](best-practices.md#avoid-deeply-nested-state)         |
| **State vs Refs**               | State that doesn't affect render output              | Medium   | [📖](best-practices.md#state-vs-refs)                     |

## 🚧 Future Rules

| Rule                        | Description                              | Priority | Issue                                                            |
| --------------------------- | ---------------------------------------- | -------- | ---------------------------------------------------------------- |
| **Form State Patterns**     | Suggest form libraries for complex forms | Medium   | [#42](https://github.com/kevinmaes/better-react-state/issues/42) |
| **State Machine Detection** | Suggest FSM for complex state logic      | Medium   | [#43](https://github.com/kevinmaes/better-react-state/issues/43) |
| **Global State Overuse**    | Context at root with limited usage       | Low      | [#44](https://github.com/kevinmaes/better-react-state/issues/44) |

## Next Steps

### Immediate Priorities

1. **Example Applications** ([#36](https://github.com/kevinmaes/better-react-state/issues/36))
   - Todo app, shopping cart, complex form examples in `examples/` directory

2. **Real-World Testing** ([#37](https://github.com/kevinmaes/better-react-state/issues/37))
   - Test on popular React repositories and document findings

3. **Auto-fix Support** ([#2](https://github.com/kevinmaes/better-react-state/issues/2))
   - Implement `--fix` flag for applicable rules

### ESLint Plugin

Transform into `eslint-plugin-better-react-state` for:

- IDE integration and real-time feedback
- Leveraging existing developer workflows
- Auto-fix infrastructure

Target rules: All implemented rules + high-priority future rules

## Success Metrics

- Adoption: Issues detected and fixed
- False positive rate < 10%
- Developer feedback ratings
- Performance on large codebases

## Resources

- [Best Practices Documentation](best-practices.md)
- [Blog: Structuring State in React](https://certificates.dev/blog/structuring-state-in-react-5-essential-patterns)
- [React Docs: Managing State](https://react.dev/learn/managing-state)

---

_Last updated: 2025-01-04_
