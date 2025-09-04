import React, { useState, useRef, useEffect } from 'react';

// ❌ Bad: Timer IDs stored in state
function BadTimerComponent() {
  const [intervalId, setIntervalId] = useState<number | null>(null);
  const [timerId, setTimerId] = useState<number | null>(null);

  const startInterval = () => {
    const id = setInterval(() => {
      console.log('tick');
    }, 1000);
    setIntervalId(id); // Causes unnecessary re-render
  };

  const startTimer = () => {
    const id = setTimeout(() => {
      console.log('timeout');
    }, 5000);
    setTimerId(id); // Causes unnecessary re-render
  };

  return (
    <div>
      <button onClick={startInterval}>Start Interval</button>
      <button onClick={startTimer}>Start Timer</button>
    </div>
  );
}

// ✅ Good: Timer IDs using refs
function GoodTimerComponent() {
  const intervalIdRef = useRef<number | null>(null);
  const timerIdRef = useRef<number | null>(null);

  const startInterval = () => {
    const id = setInterval(() => {
      console.log('tick');
    }, 1000);
    intervalIdRef.current = id; // No re-render
  };

  const startTimer = () => {
    const id = setTimeout(() => {
      console.log('timeout');
    }, 5000);
    timerIdRef.current = id; // No re-render
  };

  return (
    <div>
      <button onClick={startInterval}>Start Interval</button>
      <button onClick={startTimer}>Start Timer</button>
    </div>
  );
}

// ❌ Bad: Previous values for comparison stored in state
function BadPreviousValueComponent({ value }: { value: number }) {
  const [previousValue, setPreviousValue] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    if (value !== previousValue) {
      console.log(`Value changed from ${previousValue} to ${value}`);
      setPreviousValue(value); // Causes unnecessary re-render
      setLastUpdate(Date.now()); // Also causes unnecessary re-render
    }
  }, [value, previousValue]);

  return <div>Current value: {value}</div>;
}

// ✅ Good: Previous values using refs
function GoodPreviousValueComponent({ value }: { value: number }) {
  const previousValueRef = useRef(0);
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    if (value !== previousValueRef.current) {
      console.log(`Value changed from ${previousValueRef.current} to ${value}`);
      previousValueRef.current = value; // No re-render
      lastUpdateRef.current = Date.now(); // No re-render
    }
  }, [value]);

  return <div>Current value: {value}</div>;
}

// ❌ Bad: Click counting stored in state but never displayed
function BadClickCounterComponent() {
  const [clickCount, setClickCount] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);

  const handleClick = () => {
    setClickCount((prev) => {
      const newCount = prev + 1;
      console.log('Click count:', newCount); // Only logged, never displayed
      return newCount;
    });
  };

  const handleTotalClick = () => {
    setTotalClicks((prev) => {
      const newTotal = prev + 1;
      console.log('Total clicks:', newTotal); // Only logged
      return newTotal;
    });
  };

  return (
    <div>
      <button onClick={handleClick}>Click me</button>
      <button onClick={handleTotalClick}>Count Total</button>
      <p>This component tracks clicks but doesn't show the count</p>
    </div>
  );
}

// ✅ Good: Click counting using refs when not displayed
function GoodClickCounterComponent() {
  const clickCountRef = useRef(0);
  const totalClicksRef = useRef(0);

  const handleClick = () => {
    clickCountRef.current += 1;
    console.log('Click count:', clickCountRef.current); // Only logged, no re-render
  };

  const handleTotalClick = () => {
    totalClicksRef.current += 1;
    console.log('Total clicks:', totalClicksRef.current); // Only logged, no re-render
  };

  return (
    <div>
      <button onClick={handleClick}>Click me</button>
      <button onClick={handleTotalClick}>Count Total</button>
      <p>This component tracks clicks but doesn't show the count</p>
    </div>
  );
}

// ❌ Bad: DOM element reference stored in state
function BadDOMRefComponent() {
  const [inputElement, setInputElement] = useState<HTMLInputElement | null>(null);

  const focusInput = () => {
    if (inputElement) {
      inputElement.focus();
    }
  };

  return (
    <div>
      <input
        ref={(el) => setInputElement(el)} // Causes re-render on mount
        type="text"
      />
      <button onClick={focusInput}>Focus Input</button>
    </div>
  );
}

// ✅ Good: DOM element reference using ref
function GoodDOMRefComponent() {
  const inputElementRef = useRef<HTMLInputElement | null>(null);

  const focusInput = () => {
    if (inputElementRef.current) {
      inputElementRef.current.focus();
    }
  };

  return (
    <div>
      <input
        ref={inputElementRef} // No re-render
        type="text"
      />
      <button onClick={focusInput}>Focus Input</button>
    </div>
  );
}

// ❌ Bad: Tracking without display
function BadTrackingComponent() {
  const [renderCount, setRenderCount] = useState(0);
  const [mountTime, setMountTime] = useState(Date.now());

  useEffect(() => {
    setRenderCount((prev) => prev + 1); // Only tracked, never displayed
  });

  useEffect(() => {
    setMountTime(Date.now()); // Set once, never displayed
  }, []);

  return <div>Component renders but doesn't show tracking info</div>;
}

// ✅ Good: Tracking using refs
function GoodTrackingComponent() {
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    renderCountRef.current += 1; // Only tracked, no re-render
  });

  useEffect(() => {
    mountTimeRef.current = Date.now(); // Set once, no re-render
  }, []);

  return <div>Component renders but doesn't show tracking info</div>;
}

// ✅ Legitimate useState usage - should NOT be flagged
function LegitimateStateComponent() {
  const [count, setCount] = useState(0); // Used in render
  const [isVisible, setIsVisible] = useState(true); // Used in render
  const [message, setMessage] = useState(''); // Used in render

  const handleClick = () => {
    setCount((prev) => prev + 1);
  };

  const toggleVisibility = () => {
    setIsVisible((prev) => !prev);
  };

  const updateMessage = () => {
    setMessage('Updated!');
  };

  return (
    <div>
      <p>Count: {count}</p>
      {isVisible && <p>Visible content</p>}
      <p>{message}</p>
      <button onClick={handleClick}>Increment</button>
      <button onClick={toggleVisibility}>Toggle</button>
      <button onClick={updateMessage}>Update Message</button>
    </div>
  );
}

// ❌ Bad: Mixed usage - some state used for display, some not
function MixedUsageComponent() {
  const [displayCount, setDisplayCount] = useState(0); // Used in render - OK
  const [debugCount, setDebugCount] = useState(0); // Only logged - should be ref
  const [position, setPosition] = useState(0); // Only used for calculations - should be ref

  const handleClick = () => {
    setDisplayCount((prev) => prev + 1); // Legitimate - shows in UI
    setDebugCount((prev) => {
      const newCount = prev + 1;
      console.log('Debug count:', newCount); // Only logged
      return newCount;
    });
    setPosition((prev) => {
      const newPos = prev + 10;
      // Used for calculations but not displayed
      if (newPos > 100) {
        console.log('Position reset');
        return 0;
      }
      return newPos;
    });
  };

  return (
    <div>
      <p>Display count: {displayCount}</p>
      <button onClick={handleClick}>Click</button>
    </div>
  );
}
