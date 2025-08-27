import React, { useState } from 'react';

// Example 1: Loading states that can contradict
export function BadDataFetcher() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setHasError(false);
    setIsSuccess(false);

    try {
      await fetch('/api/data');
      setIsLoading(false);
      setIsSuccess(true);
    } catch {
      setIsLoading(false);
      setHasError(true);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (hasError) return <div>Error!</div>;
  if (isSuccess) return <div>Success!</div>;
  return <button onClick={fetchData}>Fetch</button>;
}

// Example 2: Modal states that conflict
export function BadModal() {
  const [isOpen, _setIsOpen] = useState(false);
  const [_isClosed, _setIsClosed] = useState(true);
  const [_isClosing, _setIsClosing] = useState(false);

  return <div>{isOpen && <div>Modal content</div>}</div>;
}

// Example 3: Good - Single state machine
export function GoodDataFetcher() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const fetchData = async () => {
    setStatus('loading');

    try {
      await fetch('/api/data');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'error') return <div>Error!</div>;
  if (status === 'success') return <div>Success!</div>;
  return <button onClick={fetchData}>Fetch</button>;
}
