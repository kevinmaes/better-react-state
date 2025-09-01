# Todo App with React State Antipatterns

This is an example React todo application that **intentionally** demonstrates common state management antipatterns. It's designed to be analyzed by the `better-react-state` tool to identify and understand these issues.

## Running the Analysis

From this directory:

```bash
npm run analyze
```

Or from the project root:

```bash
./dist/cli.js examples/todo-app-antipatterns/src
```

## Antipatterns Demonstrated

### 1. **Deeply Nested State** (App.tsx)

```javascript
const [appState, setAppState] = useState({
  user: {
    profile: {
      settings: {
        preferences: {
          theme: 'light',
          notifications: { ... }
        }
      }
    }
  }
});
```

**Problem**: Updates require spreading through multiple levels, making the code error-prone and hard to maintain.

### 2. **Multiple Related States** (App.tsx)

```javascript
const [filter, setFilter] = useState('all');
const [sortBy, setSortBy] = useState('date');
const [sortOrder, setSortOrder] = useState('asc');
const [searchQuery, setSearchQuery] = useState('');
```

**Problem**: These view-related states update together and should be grouped into a single state object.

### 3. **Contradicting Boolean States** (App.tsx, TodoForm.tsx)

```javascript
const [isLoading, setIsLoading] = useState(false);
const [hasError, setHasError] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
```

**Problem**: Multiple booleans can be true simultaneously, creating impossible states. Should use a single status enum.

### 4. **Redundant/Computed State** (App.tsx, TodoStats.tsx)

```javascript
const [completedCount, setCompletedCount] = useState(0);
const [pendingCount, setPendingCount] = useState(0);
const [totalCount, setTotalCount] = useState(0);
```

**Problem**: These values can be computed from the todos array and shouldn't be stored in state.

### 5. **State Duplication** (App.tsx, TodoList.tsx)

```javascript
const [selectedTodo, setSelectedTodo] = (useState < Todo) | (null > null);
const [selectedTodoId, setSelectedTodoId] = useState < string > '';
const [selectedTodoTitle, setSelectedTodoTitle] = useState('');
```

**Problem**: Storing the same data in multiple places leads to synchronization issues.

### 6. **Complex State Logic** (TodoForm.tsx)

Multiple useState calls that update together in event handlers, indicating the need for useReducer:

```javascript
setIsSubmitting(true);
setIsValid(true);
setHasErrors(false);
setTitle('');
setDescription('');
// ... many more
```

### 7. **Props Duplicated in State** (TodoList.tsx, TodoStats.tsx)

```javascript
const [localTodos, setLocalTodos] = useState(todos);
const [currentFilter, setCurrentFilter] = useState(filter);
```

**Problem**: Creates synchronization issues between props and state.

### 8. **UI State in JavaScript** (TodoItem.tsx)

```javascript
const [isHovered, setIsHovered] = useState(false);
const [isActive, setIsActive] = useState(false);
```

**Problem**: CSS pseudo-classes (:hover, :active) should handle this instead of React state.

## Expected Analysis Results

When you run `better-react-state` on this project, it should identify:

- ❌ Multiple instances of contradicting boolean states
- ⚠️ Deeply nested state structures
- ⚠️ Related states that should be grouped
- ⚠️ Redundant state that can be computed
- ⚠️ State duplication issues
- ℹ️ Complex state logic that would benefit from useReducer

## How to Fix These Issues

1. **Use a single state object** for related values
2. **Use enums or unions** instead of multiple booleans
3. **Compute values during render** instead of storing them
4. **Keep state flat** or use normalization patterns
5. **Use useReducer** for complex state logic
6. **Don't duplicate props in state** - use props directly
7. **Use CSS** for UI states like hover and active

This example serves as a learning tool to understand what NOT to do in React state management.
