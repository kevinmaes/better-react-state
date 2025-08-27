# React State Management Best Practices

This document outlines best practices for managing state in React applications. These patterns help prevent common bugs, improve performance, and make code more maintainable.

## Core Philosophy

### 1. Explicit Over Implicit

State changes should be traceable to specific user actions or system events. Avoid "magic" state updates that happen without clear cause.

### 2. Type-Safe State Transitions

Leverage TypeScript to define all possible state shapes and transitions upfront, making invalid states impossible to represent.

### 3. Single Source of Truth

Each piece of data should have one authoritative location. Derive everything else.

## Table of Contents

1. [Group Related State](#group-related-state)
2. [Avoid State Contradictions](#avoid-state-contradictions)
3. [Avoid Redundant State](#avoid-redundant-state)
4. [Avoid State Duplication](#avoid-state-duplication)
5. [Avoid Deeply Nested State](#avoid-deeply-nested-state)
6. [Prefer Explicit State Transitions](#prefer-explicit-state-transitions)

## 1. Group Related State

### Problem

Separate state variables for related data can lead to synchronization bugs and partial updates.

### Solution

Combine related state into a single object to ensure atomic updates.

### Examples

#### ❌ Bad: Separate state for related data

```javascript
function ShoppingCart() {
  const [productId, setProductId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);

  // Risk: Forgetting to update all related states together
  const updateItem = (newProductId, newQuantity, newPrice) => {
    setProductId(newProductId);
    setQuantity(newQuantity);
    // Oops! Forgot to update price
  };
}
```

#### ✅ Good: Grouped related state

```javascript
function ShoppingCart() {
  const [cartItem, setCartItem] = useState({
    productId: null,
    quantity: 1,
    price: 0,
  });

  // All related data updates together
  const updateItem = (newItem) => {
    setCartItem(newItem);
  };
}
```

**Note:** For complex related state with multiple update patterns, consider XState Store which enforces grouped state with explicit update events.

## 2. Avoid State Contradictions

### Problem

Multiple boolean states can create impossible or contradictory UI states.

### Solution

Use a single state variable with mutually exclusive values (finite state machine pattern).

### Examples

#### ❌ Bad: Multiple booleans that can contradict

```javascript
function DataFetcher() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Possible invalid state: isLoading=true AND hasError=true
  // What should the UI show?
}
```

#### ✅ Good: Single state with exclusive values

```javascript
function DataFetcher() {
  const [status, setStatus] = useState('idle');
  // Possible values: 'idle' | 'loading' | 'success' | 'error'

  // Clear, mutually exclusive states
  if (status === 'loading') return <Spinner />;
  if (status === 'error') return <ErrorMessage />;
  if (status === 'success') return <SuccessView />;
  return <IdleView />;
}
```

#### ✅ Advanced: XState Store for guaranteed state exclusivity

```javascript
import { createStore } from '@xstate/store';

const dataStore = createStore({
  context: {
    status: 'idle' as 'idle' | 'loading' | 'success' | 'error',
    data: null,
    error: null
  },
  on: {
    fetch: (context) => ({ ...context, status: 'loading' }),
    fetchSuccess: (context, event: { data: any }) => ({
      ...context,
      status: 'success',
      data: event.data,
      error: null
    }),
    fetchError: (context, event: { error: Error }) => ({
      ...context,
      status: 'error',
      error: event.error,
      data: null
    })
  }
});

// Impossible to have loading=true AND error=true
// State transitions are explicit and type-safe
```

## 3. Avoid Redundant State

### Problem

Storing values that can be computed from existing state creates synchronization issues.

### Solution

Calculate derived values during render instead of storing them in state.

### Examples

#### ❌ Bad: Storing computed values

```javascript
function ShoppingCart() {
  const [items, setItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  // Must remember to update totalPrice and itemCount
  // whenever items change
  const addItem = (item) => {
    const newItems = [...items, item];
    setItems(newItems);
    setTotalPrice(calculateTotal(newItems)); // Easy to forget
    setItemCount(newItems.length); // Easy to forget
  };
}
```

#### ✅ Good: Computing values during render

```javascript
function ShoppingCart() {
  const [items, setItems] = useState([]);

  // Computed on every render - always in sync
  const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
  const itemCount = items.length;

  const addItem = (item) => {
    setItems([...items, item]);
    // No need to update computed values
  };
}
```

## 4. Avoid State Duplication

### Problem

Storing the same data in multiple places causes consistency problems.

### Solution

Use a single source of truth and reference it where needed.

### Examples

#### ❌ Bad: Duplicating data

```javascript
function TodoList() {
  const [todos, setTodos] = useState([{ id: 1, text: 'Learn React', completed: false }]);

  // Duplicating the entire todo object
  const [editingTodo, setEditingTodo] = useState({
    id: 1,
    text: 'Learn React',
    completed: false,
  });

  // Risk: editingTodo can get out of sync with todos array
}
```

#### ✅ Good: Single source of truth

```javascript
function TodoList() {
  const [todos, setTodos] = useState([{ id: 1, text: 'Learn React', completed: false }]);

  // Only store the reference (ID)
  const [editingTodoId, setEditingTodoId] = useState(null);

  // Derive the actual todo from the source of truth
  const editingTodo = todos.find((todo) => todo.id === editingTodoId);
}
```

## 5. Avoid Deeply Nested State

### Problem

Deeply nested state objects are difficult to update immutably and prone to bugs.

### Solution

Flatten state structure or normalize complex data.

### Examples

#### ❌ Bad: Deeply nested state

```javascript
function UserProfile() {
  const [user, setUser] = useState({
    profile: {
      details: {
        address: {
          street: '123 Main St',
          city: 'Boston',
        },
      },
    },
  });

  // Complex update for nested property
  const updateCity = (newCity) => {
    setUser({
      ...user,
      profile: {
        ...user.profile,
        details: {
          ...user.profile.details,
          address: {
            ...user.profile.details.address,
            city: newCity,
          },
        },
      },
    });
  };
}
```

#### ✅ Good: Flattened state

```javascript
function UserProfile() {
  const [userProfile, setUserProfile] = useState({
    street: '123 Main St',
    city: 'Boston',
  });

  // Simple update
  const updateCity = (newCity) => {
    setUserProfile({
      ...userProfile,
      city: newCity,
    });
  };
}
```

#### ✅ Alternative: Normalized state

```javascript
function App() {
  // Normalized data structure
  const [entities, setEntities] = useState({
    users: {
      1: { id: 1, name: 'John', addressId: 'addr1' },
    },
    addresses: {
      addr1: { id: 'addr1', street: '123 Main St', city: 'Boston' },
    },
  });

  // Simple updates to specific entities
  const updateCity = (addressId, newCity) => {
    setEntities((prev) => ({
      ...prev,
      addresses: {
        ...prev.addresses,
        [addressId]: {
          ...prev.addresses[addressId],
          city: newCity,
        },
      },
    }));
  };
}
```

## 6. Prefer Explicit State Transitions

### Problem

Multiple `useState` calls with implicit updates scattered throughout the component make it difficult to understand how and why state changes.

### Solution

Use `useReducer` with explicit actions to make state transitions predictable and type-safe.

### Examples

#### ❌ Bad: Implicit state changes with multiple useState

```javascript
function UserForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitCount, setSubmitCount] = useState(0);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors({});
    setSubmitCount((prev) => prev + 1);

    try {
      await api.submit({ name, email });
      setName('');
      setEmail('');
      setIsSubmitting(false);
    } catch (err) {
      setErrors(err.errors);
      setIsSubmitting(false);
    }
  };

  // State changes are scattered and implicit
}
```

#### ✅ Good: Explicit actions with useReducer

```javascript
// Define actions upfront with TypeScript
type FormAction =
  | { type: 'START_SUBMIT' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errors: Record<string, string> }
  | { type: 'UPDATE_FIELD'; field: 'name' | 'email'; value: string }
  | { type: 'RESET_FORM' };

interface FormState {
  name: string;
  email: string;
  isSubmitting: boolean;
  errors: Record<string, string>;
  submitCount: number;
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'START_SUBMIT':
      return {
        ...state,
        isSubmitting: true,
        errors: {},
        submitCount: state.submitCount + 1
      };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        isSubmitting: false,
        name: '',
        email: ''
      };
    case 'SUBMIT_ERROR':
      return {
        ...state,
        isSubmitting: false,
        errors: action.errors
      };
    case 'UPDATE_FIELD':
      return {
        ...state,
        [action.field]: action.value
      };
    case 'RESET_FORM':
      return initialState;
    default:
      return state;
  }
}

function UserForm() {
  const [state, dispatch] = useReducer(formReducer, initialState);

  const handleSubmit = async () => {
    dispatch({ type: 'START_SUBMIT' });

    try {
      await api.submit({ name: state.name, email: state.email });
      dispatch({ type: 'SUBMIT_SUCCESS' });
    } catch (err) {
      dispatch({ type: 'SUBMIT_ERROR', errors: err.errors });
    }
  };

  // All state changes are explicit and type-safe
}
```

### Benefits of Explicit State Transitions

1. **Predictability**: All possible state changes are defined in one place
2. **Type Safety**: TypeScript can enforce valid actions and payloads
3. **Debugging**: Easy to log actions and understand state evolution
4. **Testing**: Reducer logic can be tested in isolation
5. **Time Travel**: Actions can be replayed for debugging

### When to Use useReducer

Consider `useReducer` when:

- You have multiple state values that change together
- State updates depend on previous state in complex ways
- You want to centralize state update logic
- You need better debugging capabilities
- Multiple components need to trigger the same state changes

### Next Level: XState Store

For even more explicit state management, consider XState Store which provides event-driven state with built-in TypeScript support:

#### ✅ Advanced: XState Store for explicit events

```javascript
import { createStore } from '@xstate/store';

// Define the store with explicit events
const formStore = createStore({
  context: {
    name: '',
    email: '',
    isSubmitting: false,
    errors: {},
    submitCount: 0
  },
  on: {
    updateField: (context, event: { field: string; value: string }) => ({
      ...context,
      [event.field]: event.value
    }),
    startSubmit: (context) => ({
      ...context,
      isSubmitting: true,
      errors: {},
      submitCount: context.submitCount + 1
    }),
    submitSuccess: (context) => ({
      ...context,
      isSubmitting: false,
      name: '',
      email: ''
    }),
    submitError: (context, event: { errors: Record<string, string> }) => ({
      ...context,
      isSubmitting: false,
      errors: event.errors
    })
  }
});

function UserForm() {
  const { name, email, isSubmitting } = formStore.useSelector(state => state);

  const handleSubmit = async () => {
    formStore.send({ type: 'startSubmit' });

    try {
      await api.submit({ name, email });
      formStore.send({ type: 'submitSuccess' });
    } catch (err) {
      formStore.send({ type: 'submitError', errors: err.errors });
    }
  };

  // Even more explicit with automatic TypeScript inference
}
```

Benefits over useReducer:

- Simpler API with automatic TypeScript inference
- Built-in React integration with `useSelector`
- Global and local state support
- Side effects handling built-in

## Additional Best Practices

### Use State Sparingly

- Not all data needs to be in state
- Constants and computed values should not be stored in state
- Consider if the data truly needs to trigger re-renders

### Initialize State Carefully

- Use lazy initial state for expensive computations
- Avoid initializing state with props (can cause sync issues)

```javascript
// ❌ Bad: Expensive computation on every render
const [data, setData] = useState(expensiveComputation());

// ✅ Good: Lazy initialization
const [data, setData] = useState(() => expensiveComputation());
```

### Consider State Location

- Lift state up only when necessary
- Keep state as close to where it's used as possible
- Use context for truly global state, not for prop drilling prevention

### Make State Changes Traceable

- Name your actions/events clearly (e.g., 'USER_CLICKED_SUBMIT' not 'UPDATE')
- Consider logging state transitions in development
- Use React DevTools to inspect state changes

### Consider Modern State Libraries

For applications with complex state needs, consider:

- **XState Store**: Event-driven state management with TypeScript-first design
- Use stores for complex, related state with multiple transitions
- Use atoms for simple, independent state pieces

Example of XState atoms for independent state:

```javascript
import { createAtom } from '@xstate/store';

// Simple independent state
const themeAtom = createAtom('light', {
  toggle: (state) => (state === 'light' ? 'dark' : 'light'),
});

// In component
function ThemeToggle() {
  const theme = themeAtom.useValue();

  return <button onClick={() => themeAtom.send('toggle')}>Current theme: {theme}</button>;
}
```

## Summary

Following these patterns will help you:

- Reduce bugs caused by state synchronization issues
- Make your components more predictable
- Improve performance by avoiding unnecessary state
- Make code easier to understand and maintain

When in doubt, ask yourself:

1. Can this be computed from existing state?
2. Am I storing the same information in multiple places?
3. Can these states contradict each other?
4. Should these related values be grouped?
5. Is this state structure too deeply nested?
