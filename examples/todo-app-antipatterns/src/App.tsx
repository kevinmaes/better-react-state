import React, { useState } from 'react';
import { TodoList } from './components/TodoList';
import { TodoForm } from './components/TodoForm';
import { TodoStats } from './components/TodoStats';
import type { Todo } from './types';

export function App() {
  // ANTIPATTERN 1: Deeply nested state
  const [appState, setAppState] = useState({
    user: {
      profile: {
        settings: {
          preferences: {
            theme: 'light',
            notifications: {
              email: true,
              push: false,
              sms: false,
            },
          },
        },
      },
    },
    ui: {
      modals: {
        addTodo: {
          isOpen: false,
          position: { x: 0, y: 0 },
        },
      },
    },
  });

  // ANTIPATTERN 2: Multiple related states that should be grouped
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // ANTIPATTERN 3: Contradicting boolean states
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // ANTIPATTERN 4: Redundant state (can be computed)
  const [completedCount, setCompletedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // ANTIPATTERN 5: State duplication
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [selectedTodoId, setSelectedTodoId] = useState<string>('');
  const [selectedTodoTitle, setSelectedTodoTitle] = useState('');

  // ANTIPATTERN 6: Complex state updates that should use useReducer
  const addTodo = (title: string) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      title,
      completed: false,
      createdAt: new Date(),
    };

    // Multiple state updates together
    setTodos([...todos, newTodo]);
    setTotalCount(totalCount + 1);
    setPendingCount(pendingCount + 1);
    setIsLoading(false);
    setIsSuccess(true);
    setHasError(false);
  };

  const toggleTodo = (id: string) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updatedTodos);

    // Manually updating computed values
    const completed = updatedTodos.filter((t) => t.completed).length;
    const pending = updatedTodos.filter((t) => !t.completed).length;
    setCompletedCount(completed);
    setPendingCount(pending);
  };

  const selectTodo = (todo: Todo) => {
    // Duplicating state
    setSelectedTodo(todo);
    setSelectedTodoId(todo.id);
    setSelectedTodoTitle(todo.title);
  };

  const updateTheme = (theme: string) => {
    // Deeply nested state update
    setAppState({
      ...appState,
      user: {
        ...appState.user,
        profile: {
          ...appState.user.profile,
          settings: {
            ...appState.user.profile.settings,
            preferences: {
              ...appState.user.profile.settings.preferences,
              theme,
            },
          },
        },
      },
    });
  };

  return (
    <div className="app">
      <h1>Todo App (With Antipatterns)</h1>

      <div className="status">
        {isLoading && <span>Loading...</span>}
        {hasError && <span>Error occurred!</span>}
        {isSuccess && <span>Success!</span>}
      </div>

      <TodoForm onAdd={addTodo} />

      <div className="filters">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search todos..."
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="date">Date</option>
          <option value="title">Title</option>
        </select>
        <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      <TodoStats total={totalCount} completed={completedCount} pending={pendingCount} />

      <TodoList
        todos={todos}
        filter={filter}
        searchQuery={searchQuery}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onToggle={toggleTodo}
        onSelect={selectTodo}
      />

      {selectedTodo && (
        <div className="selected-todo">
          <h3>Selected: {selectedTodoTitle}</h3>
          <p>ID: {selectedTodoId}</p>
        </div>
      )}

      <div className="theme-selector">
        <button onClick={() => updateTheme('light')}>Light Theme</button>
        <button onClick={() => updateTheme('dark')}>Dark Theme</button>
        <p>Current theme: {appState.user.profile.settings.preferences.theme}</p>
      </div>
    </div>
  );
}
