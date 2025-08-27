import React, { useState } from 'react';

interface TodoFormProps {
  onAdd: (title: string) => void;
}

export function TodoForm({ onAdd }: TodoFormProps) {
  // ANTIPATTERN: Multiple related form states that should be grouped
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');

  // ANTIPATTERN: Form validation states that contradict
  const [isValid, setIsValid] = useState(true);
  const [hasErrors, setHasErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ANTIPATTERN: Redundant state
  const [titleLength, setTitleLength] = useState(0);
  const [isFormEmpty, setIsFormEmpty] = useState(true);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    // Updating redundant state
    setTitleLength(newTitle.length);
    setIsFormEmpty(newTitle.length === 0);

    // Contradicting validation states
    if (newTitle.length < 3) {
      setIsValid(false);
      setHasErrors(true);
    } else {
      setIsValid(true);
      setHasErrors(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Multiple state updates that should be a single transition
    setIsSubmitting(true);
    setIsValid(true);
    setHasErrors(false);

    if (title.trim()) {
      onAdd(title);

      // Reset all form fields
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setTags('');
      setTitleLength(0);
      setIsFormEmpty(true);
      setIsSubmitting(false);
    } else {
      setIsValid(false);
      setHasErrors(true);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="todo-form">
      <div className="form-group">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Todo title..."
          className={hasErrors ? 'error' : ''}
        />
        <span className="char-count">{titleLength}/100</span>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description..."
      />

      <select value={priority} onChange={(e) => setPriority(e.target.value)}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

      <input
        type="text"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Tags (comma separated)"
      />

      <div className="form-status">
        {!isValid && <span>Please enter a valid title</span>}
        {hasErrors && <span>Form has errors</span>}
        {isSubmitting && <span>Submitting...</span>}
        {isFormEmpty && <span>Form is empty</span>}
      </div>

      <button type="submit" disabled={!isValid || isSubmitting}>
        Add Todo
      </button>
    </form>
  );
}
