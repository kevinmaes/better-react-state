import React, { useState } from 'react';

interface TodoStatsProps {
  total: number;
  completed: number;
  pending: number;
}

export function TodoStats({ total, completed, pending }: TodoStatsProps) {
  // ANTIPATTERN: State that duplicates props
  const [totalCount, setTotalCount] = useState(total);
  const [completedCount, setCompletedCount] = useState(completed);
  const [pendingCount, setPendingCount] = useState(pending);
  
  // ANTIPATTERN: Redundant computed state
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [remainingPercentage, setRemainingPercentage] = useState(100);
  const [hasAnyTodos, setHasAnyTodos] = useState(false);
  const [allCompleted, setAllCompleted] = useState(false);
  
  // ANTIPATTERN: UI display state that contradicts
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  React.useEffect(() => {
    // Synchronizing state with props (antipattern)
    setTotalCount(total);
    setCompletedCount(completed);
    setPendingCount(pending);
    
    // Computing and storing values that could be derived
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    setCompletionPercentage(percentage);
    setRemainingPercentage(100 - percentage);
    setHasAnyTodos(total > 0);
    setAllCompleted(total > 0 && completed === total);
  }, [total, completed, pending]);

  const toggleView = () => {
    // Contradicting state updates
    if (isExpanded) {
      setIsExpanded(false);
      setIsCollapsed(true);
    } else {
      setIsExpanded(true);
      setIsCollapsed(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`todo-stats ${isExpanded ? 'expanded' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <button onClick={toggleView}>
        {isExpanded ? 'Collapse' : 'Expand'} Stats
      </button>
      
      {isExpanded && (
        <>
          <div className="stat-item">
            <span>Total:</span>
            <span>{totalCount}</span>
          </div>
          <div className="stat-item">
            <span>Completed:</span>
            <span>{completedCount}</span>
          </div>
          <div className="stat-item">
            <span>Pending:</span>
            <span>{pendingCount}</span>
          </div>
          <div className="stat-item">
            <span>Progress:</span>
            <span>{completionPercentage.toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span>Remaining:</span>
            <span>{remainingPercentage.toFixed(1)}%</span>
          </div>
          {hasAnyTodos && (
            <p>{allCompleted ? 'All todos completed!' : 'Keep going!'}</p>
          )}
        </>
      )}
      
      <button onClick={() => setIsVisible(false)}>Hide Stats</button>
    </div>
  );
}