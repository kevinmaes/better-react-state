# XState Integration Assessment for react-state-patterns

## Current State Analysis

### What We Currently Do

1. **Documentation**: Mentions XState/store in best-practices.md
2. **Rule Suggestions**: Only suggest useReducer, never XState
3. **Detection**: Don't check if components already use XState

### Proposed Enhancement Strategy

## Level 1: useReducer (Current)

**When to suggest:**

- 3-6 related state variables
- Simple state transitions
- No complex conditional logic
- Single component scope

**Example patterns:**

```javascript
// Form with multiple fields
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [errors, setErrors] = useState({});
const [isSubmitting, setIsSubmitting] = useState(false);
```

## Level 2: XState/store (Proposed)

**When to suggest:**

- 4-8 state variables with complex relationships
- Multiple contradicting boolean states
- State updates that always happen together
- Need for atomic updates
- Component-level state machines

**Example patterns:**

```javascript
// Multiple loading states that contradict
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
const [retryCount, setRetryCount] = useState(0);
const [lastError, setLastError] = useState(null);
```

**Benefits of XState/store:**

- Lighter weight than full XState
- Event-driven updates
- Built-in TypeScript support
- No state machine complexity
- Easy migration from useState

## Level 3: XState v5 (Proposed)

**When to suggest:**

- 8+ state variables
- Complex state machines with guards/actions
- Multi-step workflows (wizards, checkout flows)
- Async orchestration needs
- Parent-child state coordination
- Need for state persistence/hydration

**Example patterns:**

```javascript
// Multi-step form wizard
const [currentStep, setCurrentStep] = useState(1);
const [canGoNext, setCanGoNext] = useState(false);
const [canGoPrev, setCanGoPrev] = useState(false);
const [stepData, setStepData] = useState({});
const [validationErrors, setValidationErrors] = useState({});
const [isValidating, setIsValidating] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [saveError, setSaveError] = useState(null);
const [completedSteps, setCompletedSteps] = useState([]);
```

**Benefits of XState v5:**

- Visual state charts
- Parallel states
- History states
- Guards and actions
- Integration with dev tools
- State persistence
- Better testing

## Implementation Recommendations

### 1. Enhanced Rule Detection

```typescript
function getStateComplexityLevel(component): 'simple' | 'moderate' | 'complex' {
  const stateCount = stateCalls.length;
  const hasContradictions = detectContradictingStates();
  const hasComplexUpdates = detectComplexUpdatePatterns();
  const hasWorkflow = detectWorkflowPatterns();

  if (hasWorkflow || stateCount > 8) return 'complex';
  if (hasContradictions || hasComplexUpdates || stateCount > 4) return 'moderate';
  return 'simple';
}
```

### 2. Tiered Suggestions

```typescript
switch (complexity) {
  case 'simple':
    suggestion = 'Consider using useReducer for better state organization';
    break;
  case 'moderate':
    suggestion = 'Consider using useReducer or @xstate/store for atomic, event-driven updates';
    break;
  case 'complex':
    suggestion = 'Consider using XState v5 for complex state orchestration and visual modeling';
    break;
}
```

### 3. Pattern Detection for XState Candidates

**Workflow Patterns:**

- Step/stage/phase state variables
- Can/should/is permission states
- Validation + submission + error states together
- Retry/timeout/polling logic

**State Machine Patterns:**

- Mutually exclusive states (idle/loading/success/error)
- State-dependent UI (different views per state)
- Complex transition rules
- Async coordination

### 4. New Rule: "prefer-state-machines"

Could detect patterns like:

```javascript
// This screams for a state machine
if (status === 'loading') {
  // can't do X, Y, Z
} else if (status === 'error' && retryCount < 3) {
  // can retry
} else if (status === 'success' && !hasExpired) {
  // show data
}
```

## Migration Path Suggestions

### From useState to XState/store

```javascript
// Before: Multiple useState
const [count, setCount] = useState(0);
const [isMax, setIsMax] = useState(false);

// After: XState/store
const store = createStore({
  context: { count: 0 },
  on: {
    increment: (ctx) => ({ count: Math.min(ctx.count + 1, 10) }),
    decrement: (ctx) => ({ count: Math.max(ctx.count - 1, 0) }),
  },
});
```

### From useReducer to XState v5

Show how reducer actions map to XState events and how the reducer function becomes state machine transitions.

## Benefits of This Approach

1. **Progressive Enhancement**: Start simple, upgrade as needed
2. **Educational**: Teaches when each tool is appropriate
3. **Practical**: Provides migration paths
4. **Modern**: Leverages latest state management patterns
5. **Type-Safe**: All suggestions work great with TypeScript

## Next Steps

1. Add complexity detection to existing rules
2. Update suggestions to include XState options
3. Create new rule for state machine patterns
4. Add documentation for XState migration
5. Consider adding codemods for XState migration
