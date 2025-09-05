# React State Management Best Practices

This document outlines best practices for managing state in React applications. These patterns help prevent common bugs, improve performance, and make code more maintainable.

> **Note**: The organization of common React state patterns in this document was inspired by the excellent blog post ["Structuring State in React: 5 Essential Patterns"](https://certificates.dev/blog/structuring-state-in-react-5-essential-patterns). While the patterns themselves are industry-standard React concepts, this document expands upon them with TypeScript examples, XState integration, and additional patterns discovered through practical experience.

## Core Philosophy

### 1. Explicit Over Implicit

State changes should be traceable to specific user actions or system events. Avoid "magic" state updates that happen without clear cause.

### 2. Type-Safe State Transitions

Leverage TypeScript to define all possible state shapes and transitions upfront, making invalid states impossible to represent.

### 3. Single Source of Truth

Each piece of data should have one authoritative location. Derive everything else.

## Table of Contents

1. [Avoid State Contradictions](#avoid-state-contradictions)
2. [Avoid Redundant State](#avoid-redundant-state)
3. [Prefer Explicit State Transitions](#prefer-explicit-state-transitions)
4. [Group Related State](#group-related-state)
5. [Avoid State Duplication](#avoid-state-duplication)
6. [Avoid Deeply Nested State](#avoid-deeply-nested-state)
7. [Detect State in useEffect](#detect-state-in-useeffect)
8. [Form State Patterns](#form-state-patterns)

## 1. Avoid State Contradictions

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

## 2. Avoid Redundant State

### Problem

Storing values that can be computed from existing state creates synchronization issues.

### Solution

Calculate derived values during render instead of storing them in state.

### Examples

#### ❌ Bad: Storing computed values

```javascript
function ShoppingCart() {
  const [items, setItems] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  // Must remember to update totalCost and itemCount
  // whenever items change
  const addItem = (item) => {
    const newItems = [...items, item];
    setItems(newItems);
    setTotalCost(calculateTotal(newItems)); // Easy to forget
    setItemCount(newItems.length); // Easy to forget
  };
}
```

#### ✅ Good: Computing values during render

```javascript
function ShoppingCart() {
  const [items, setItems] = useState([]);

  // Computed on every render - always in sync
  const totalCost = items.reduce((sum, item) => sum + item.unitCost, 0);
  const itemCount = items.length;

  const addItem = (item) => {
    setItems([...items, item]);
    // No need to update computed values
  };
}
```

## 3. Prefer Explicit State Transitions

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

## 4. Group Related State

### Problem

Separate state variables for related data can lead to synchronization bugs and partial updates.

### Solution

Combine related state into a single object to ensure atomic updates.

### Examples

#### ❌ Bad: Separate state for related data

```javascript
function ShoppingCart() {
  const [itemId, setItemId] = useState(null);
  const [amount, setAmount] = useState(1);
  const [unitCost, setUnitCost] = useState(0);

  // Risk: Forgetting to update all related states together
  const updateItem = (newItemId, newAmount, newUnitCost) => {
    setItemId(newItemId);
    setAmount(newAmount);
    // Oops! Forgot to update unitCost
  };
}
```

#### ✅ Good: Grouped related state

```javascript
function ShoppingCart() {
  const [cartItem, setCartItem] = useState({
    itemId: null,
    amount: 1,
    unitCost: 0,
  });

  // All related data updates together
  const updateItem = (newItem) => {
    setCartItem(newItem);
  };
}
```

**Note:** For complex related state with multiple update patterns, consider XState Store which enforces grouped state with explicit update events.

## 5. Avoid State Duplication

### Problem

Storing the same data in multiple places causes consistency problems.

### Solution

Use a single source of truth and reference it where needed.

### Examples

#### ❌ Bad: Duplicating data

```javascript
function TodoList() {
  const [todos, setTodos] = useState([{ id: 1, text: 'Write unit tests', completed: false }]);

  // Duplicating the entire todo object
  const [editingTodo, setEditingTodo] = useState({
    id: 1,
    text: 'Write unit tests',
    completed: false,
  });

  // Risk: editingTodo can get out of sync with todos array
}
```

#### ✅ Good: Single source of truth

```javascript
function TodoList() {
  const [todos, setTodos] = useState([{ id: 1, text: 'Write unit tests', completed: false }]);

  // Only store the reference (ID)
  const [editingTodoId, setEditingTodoId] = useState(null);

  // Derive the actual todo from the source of truth
  const editingTodo = todos.find((todo) => todo.id === editingTodoId);
}
```

## 6. Avoid Deeply Nested State

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

## 7. Detect State in useEffect

### Problem

Using `setState` inside `useEffect` to store derived values causes unnecessary renders and complexity. This is a common misunderstanding where developers treat `useEffect` as a place to compute values, when they should be computed during render.

### Solution

Compute derived values during render or use `useMemo` for expensive computations. Only use `useEffect` for genuine side effects like API calls, subscriptions, or DOM manipulations.

### Examples

#### ❌ Bad: Storing derived state in useEffect

```javascript
function ProductList({ products }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);

  // Unnecessary state and extra render cycle
  useEffect(() => {
    const filtered = products.filter((p) => p.name.includes(searchTerm));
    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  return (
    <div>
      {filteredProducts.map((p) => (
        <Product key={p.id} {...p} />
      ))}
    </div>
  );
}
```

#### ✅ Good: Compute during render

```javascript
function ProductList({ products }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Computed during render - no extra state or renders
  const filteredProducts = products.filter((p) => p.name.includes(searchTerm));

  return (
    <div>
      {filteredProducts.map((p) => (
        <Product key={p.id} {...p} />
      ))}
    </div>
  );
}
```

#### ✅ Good: Use useMemo for expensive computations

```javascript
function ProductList({ products }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Memoized for performance if computation is expensive
  const filteredProducts = useMemo(
    () => products.filter((p) => p.name.includes(searchTerm)),
    [products, searchTerm]
  );

  return (
    <div>
      {filteredProducts.map((p) => (
        <Product key={p.id} {...p} />
      ))}
    </div>
  );
}
```

### Common Antipatterns

1. **Storing formatted values**

   ```javascript
   // ❌ Bad
   useEffect(() => {
     setFormattedDate(date.toLocaleDateString());
   }, [date]);

   // ✅ Good - compute during render
   const formattedDate = date.toLocaleDateString();
   ```

2. **Storing computed totals/counts**

   ```javascript
   // ❌ Bad
   useEffect(() => {
     setTotal(items.reduce((sum, item) => sum + item.price, 0));
   }, [items]);

   // ✅ Good - compute during render or useMemo
   const total = useMemo(() => items.reduce((sum, item) => sum + item.price, 0), [items]);
   ```

3. **Duplicating props in state**

   ```javascript
   // ❌ Bad
   useEffect(() => {
     setLocalValue(propValue);
   }, [propValue]);

   // ✅ Good - use the prop directly
   // If you need local modifications, use a different pattern
   ```

### Legitimate Uses of setState in useEffect

`useEffect` with `setState` IS appropriate for:

- **External data fetching**: API calls, database queries
- **Browser/DOM APIs**: window size, scroll position, localStorage
- **Subscriptions**: WebSockets, event listeners, observables
- **Timers**: setTimeout, setInterval
- **External library integration**: Third-party SDK initialization

```javascript
// ✅ Good: External data source
useEffect(() => {
  fetchUserData(userId).then(setUserData);
}, [userId]);

// ✅ Good: Browser API subscription
useEffect(() => {
  const handleResize = () => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### Key Principle

**If you can compute it during render without side effects, don't put it in useEffect.**

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

## 8. Form State Patterns

### Problem

Complex forms with many individual `useState` calls become difficult to manage, especially when they include validation, reset logic, and multiple related fields. This leads to:

- Manual reset functions with many setter calls
- Scattered validation state across multiple variables
- Performance issues due to frequent re-renders
- Difficult state synchronization between related form fields

### Solution

For complex forms (7+ state variables), use form libraries or unified state management approaches instead of individual `useState` calls.

### Examples

#### ❌ Bad: Many individual useState calls

```typescript
function RegistrationForm() {
  // Too many individual state variables
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Scattered validation states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    // Manual reset of many fields
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPhone('');
    setAddress('');
    setCity('');
    setZipCode('');
    setEmailError('');
    setPasswordError('');
    setTouchedEmail(false);
  };

  return (
    <form>
      <input value={firstName} onChange={e => setFirstName(e.target.value)} />
      <input value={lastName} onChange={e => setLastName(e.target.value)} />
      <input value={email} onChange={e => setEmail(e.target.value)} />
      {/* ... many more inputs */}
    </form>
  );
}
```

#### ✅ Good: React Hook Form (Recommended for Complex Forms)

```typescript
import { useForm } from 'react-hook-form';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
}

function RegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    // Handle form submission
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('firstName', { required: 'First name is required' })}
      />
      {errors.firstName && <span>{errors.firstName.message}</span>}

      <input
        {...register('email', {
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email format'
          }
        })}
      />
      {errors.email && <span>{errors.email.message}</span>}

      <input
        type="password"
        {...register('password', {
          required: 'Password is required',
          minLength: { value: 8, message: 'Password must be 8+ characters' }
        })}
      />
      {errors.password && <span>{errors.password.message}</span>}

      {/* ... other fields */}

      <button type="button" onClick={() => reset()}>Reset</button>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

#### ✅ Good: TanStack Form (Type-Safe Alternative)

```typescript
import { useForm } from '@tanstack/react-form';

function RegistrationForm() {
  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      address: '',
      city: '',
      zipCode: ''
    },
    onSubmit: async ({ value }) => {
      console.log('Form data:', value);
    }
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field name="firstName">
        {(field) => (
          <div>
            <input
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors && (
              <span>{field.state.meta.errors}</span>
            )}
          </div>
        )}
      </form.Field>

      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) =>
            !value.includes('@') ? 'Invalid email' : undefined
        }}
      >
        {(field) => (
          <div>
            <input
              type="email"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors && (
              <span>{field.state.meta.errors}</span>
            )}
          </div>
        )}
      </form.Field>

      {/* ... other fields */}

      <button type="submit">Submit</button>
    </form>
  );
}
```

#### ✅ Good: Grouped State (For Simpler Forms)

```typescript
interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
}

const initialFormState: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  address: '',
  city: '',
  zipCode: ''
};

function RegistrationForm() {
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});

  const updateField = (field: keyof FormState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setErrors({});
    setTouched({});
  };

  return (
    <form>
      <input
        value={formData.firstName}
        onChange={(e) => updateField('firstName', e.target.value)}
      />
      <input
        value={formData.lastName}
        onChange={(e) => updateField('lastName', e.target.value)}
      />
      <input
        type="email"
        value={formData.email}
        onChange={(e) => updateField('email', e.target.value)}
      />
      {/* ... other fields */}

      <button type="button" onClick={resetForm}>Reset</button>
      <button type="submit">Submit</button>
    </form>
  );
}
```

#### ✅ Good: useReducer (For Complex State Logic)

```typescript
type FormAction =
  | { type: 'UPDATE_FIELD'; field: keyof FormState; value: string }
  | { type: 'SET_ERROR'; field: keyof FormState; error: string }
  | { type: 'CLEAR_ERROR'; field: keyof FormState }
  | { type: 'RESET' }
  | { type: 'SET_SUBMITTING'; submitting: boolean };

interface FormReducerState extends FormState {
  errors: Partial<FormState>;
  touched: Partial<Record<keyof FormState, boolean>>;
  isSubmitting: boolean;
}

const initialState: FormReducerState = {
  ...initialFormState,
  errors: {},
  touched: {},
  isSubmitting: false
};

function formReducer(state: FormReducerState, action: FormAction): FormReducerState {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        [action.field]: action.value,
        touched: { ...state.touched, [action.field]: true }
      };
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error }
      };
    case 'CLEAR_ERROR':
      const newErrors = { ...state.errors };
      delete newErrors[action.field];
      return { ...state, errors: newErrors };
    case 'RESET':
      return initialState;
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.submitting };
    default:
      return state;
  }
}

function RegistrationForm() {
  const [state, dispatch] = useReducer(formReducer, initialState);

  const updateField = (field: keyof FormState, value: string) => {
    dispatch({ type: 'UPDATE_FIELD', field, value });
  };

  const resetForm = () => {
    dispatch({ type: 'RESET' });
  };

  return (
    <form>
      <input
        value={state.firstName}
        onChange={(e) => updateField('firstName', e.target.value)}
      />
      {/* ... other fields */}
      <button type="button" onClick={resetForm}>Reset</button>
      <button type="submit" disabled={state.isSubmitting}>Submit</button>
    </form>
  );
}
```

### When to Use Each Approach

- **React Hook Form**: Best for most complex forms (10+ fields). Excellent performance, built-in validation, great TypeScript support
- **TanStack Form**: Great for type-safe forms with advanced features. Framework agnostic
- **Conform**: Ideal for progressive enhancement and SSR scenarios
- **Grouped State**: Good for medium complexity forms (5-8 fields) with simple validation
- **useReducer**: Best when form has complex state transitions and business logic

### Benefits

- **Easier Reset**: Single function call instead of multiple setters
- **Better Performance**: Fewer re-renders, optimized updates
- **Built-in Validation**: Form libraries provide comprehensive validation
- **Better Accessibility**: Form libraries handle focus management and ARIA attributes
- **Less Boilerplate**: Reduce repetitive state management code
- **Type Safety**: Better TypeScript integration

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
6. Does this form have too many individual state variables?
