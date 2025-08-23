import React, { useState } from 'react';
import type { Todo } from '../types';

interface TodoListProps {
  todos: Todo[];
  filter: string;
  searchQuery: string;
  sortBy: string;
  sortOrder: string;
  onToggle: (id: string) => void;
  onSelect: (todo: Todo) => void;
}

export function TodoList({
  todos,
  filter,
  searchQuery,
  sortBy,
  sortOrder,
  onToggle,
  onSelect
}: TodoListProps) {
  // ANTIPATTERN: State that duplicates props
  const [localTodos, setLocalTodos] = useState(todos);
  const [currentFilter, setCurrentFilter] = useState(filter);
  
  // ANTIPATTERN: Redundant state for filtered results
  const [filteredTodos, setFilteredTodos] = useState<Todo[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);

  // This effect shows the problem with duplicating props in state
  React.useEffect(() => {
    setLocalTodos(todos);
    
    // Complex filtering logic that updates multiple states
    let filtered = todos;
    
    if (filter === 'active') {
      filtered = filtered.filter(t => !t.completed);
    } else if (filter === 'completed') {
      filtered = filtered.filter(t => t.completed);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Updating redundant state
    setFilteredTodos(filtered);
    setVisibleCount(filtered.length);
    setCurrentFilter(filter);
  }, [todos, filter, searchQuery]);

  // The actual filtered list could be computed during render
  const displayTodos = filteredTodos.sort((a, b) => {
    if (sortBy === 'date') {
      return sortOrder === 'asc' 
        ? a.createdAt.getTime() - b.createdAt.getTime()
        : b.createdAt.getTime() - a.createdAt.getTime();
    }
    return sortOrder === 'asc'
      ? a.title.localeCompare(b.title)
      : b.title.localeCompare(a.title);
  });

  return (
    <div className="todo-list">
      <p>Showing {visibleCount} todos (filter: {currentFilter})</p>
      {displayTodos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onSelect: (todo: Todo) => void;
}

function TodoItem({ todo, onToggle, onSelect }: TodoItemProps) {
  // ANTIPATTERN: More unnecessary state duplication
  const [isCompleted, setIsCompleted] = useState(todo.completed);
  const [title, setTitle] = useState(todo.title);
  
  // ANTIPATTERN: UI state that could be CSS
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const handleToggle = () => {
    setIsCompleted(!isCompleted);
    onToggle(todo.id);
  };

  return (
    <div 
      className={`todo-item ${isCompleted ? 'completed' : ''} ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
    >
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={handleToggle}
      />
      <span 
        className={isActive ? 'active' : ''}
        onClick={() => onSelect(todo)}
      >
        {title}
      </span>
    </div>
  );
}