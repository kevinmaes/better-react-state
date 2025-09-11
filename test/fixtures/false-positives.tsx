// @ts-nocheck
// This file contains test fixtures for demonstrating false positive prevention
import React, { useState, createContext } from 'react';

// Test Case 1: State used in Context Provider (should NOT be flagged)
const PrivacyContext = createContext({ privacyMode: 'off', isPrivacyMode: false });

export function PrivacyContextExample() {
  // This should NOT be flagged - it's used in the context value
  const [privacyMode, setPrivacyMode] = useState<'off' | 'on' | 'demo'>('off');

  // Computed value that affects rendering through context
  const isPrivacyMode = privacyMode === 'demo';

  return (
    <PrivacyContext.Provider value={{ privacyMode, isPrivacyMode }}>
      <div>Privacy Mode: {privacyMode}</div>
    </PrivacyContext.Provider>
  );
}

// Test Case 2: State used in computed values that affect rendering
export function ComputedValueExample() {
  // This should NOT be flagged - used in computed value that affects render
  const [sliderWidth, setSliderWidth] = useState(300);

  const numberOfSteps = 10;
  const minTickSpacing = 30;

  // Computed values based on state
  const actualSpacing = sliderWidth / (numberOfSteps - 1);
  const showTicks = actualSpacing >= minTickSpacing;

  return (
    <div>
      <div style={{ width: sliderWidth }}>Slider</div>
      {showTicks && <div className="tick-marks">Tick marks shown</div>}
    </div>
  );
}

// Test Case 3: State used in conditional rendering
export function ConditionalRenderExample() {
  // This should NOT be flagged - used in conditional rendering
  const [visibleCounts, setVisibleCounts] = useState({
    individuals: 10,
    relations: 5,
  });

  return (
    <div>
      {visibleCounts.individuals > 0 && (
        <div>Individuals: {visibleCounts.individuals.toString().padStart(2, '0')}</div>
      )}
      {visibleCounts.relations > 0 && (
        <div>Relations: {visibleCounts.relations.toString().padStart(2, '0')}</div>
      )}
    </div>
  );
}

// Test Case 4: Different state purposes (UI vs data state)
export function DifferentStatePurposesExample() {
  // These serve different purposes - not redundant
  const [activeTransformerIds, setActiveTransformerIds] = useState<string[]>([]);
  const [selectedTransformerId, setSelectedTransformerId] = useState<string | null>(null);

  // activeTransformerIds: Which transformers are in the pipeline (data)
  // selectedTransformerId: Which transformer is selected for editing (UI)

  return (
    <div>
      <div>Active: {activeTransformerIds.join(', ')}</div>
      <div>Selected: {selectedTransformerId || 'none'}</div>
    </div>
  );
}

// Test Case 5: Legitimate UI prop passing (not prop drilling)
interface ButtonProps {
  disabled?: boolean;
  onClick?: () => void;
}

function Button({ disabled, onClick }: ButtonProps) {
  return (
    <button disabled={disabled} onClick={onClick}>
      Click me
    </button>
  );
}

function ButtonWrapper({ disabled, onClick }: ButtonProps) {
  // This should NOT be flagged as prop drilling - legitimate UI concern
  return <Button disabled={disabled} onClick={onClick} />;
}

export function UIPropsExample() {
  const [isDisabled, setIsDisabled] = useState(false);

  return <ButtonWrapper disabled={isDisabled} onClick={() => setIsDisabled(!isDisabled)} />;
}

// Test Case 6: State that actually should use ref (TRUE POSITIVE)
export function ShouldUseRefExample() {
  // This SHOULD be flagged - never affects render
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);
  const [previousValue, setPreviousValue] = useState<string>('');

  const handleClick = () => {
    if (timerId) {
      clearTimeout(timerId);
    }
    const newTimer = setTimeout(() => {
      console.log('Timer fired');
    }, 1000);
    setTimerId(newTimer);
    setPreviousValue('clicked');
  };

  return <button onClick={handleClick}>Start Timer</button>;
}

// Test Case 7: Actually redundant state (TRUE POSITIVE)
export function RedundantStateExample() {
  const [items, setItems] = useState<string[]>(['a', 'b', 'c']);
  // This SHOULD be flagged - can be computed from items
  const [itemCount, setItemCount] = useState(3);

  const addItem = (item: string) => {
    setItems([...items, item]);
    setItemCount(items.length + 1); // Redundant update
  };

  return (
    <div>
      <div>Items: {items.join(', ')}</div>
      <div>Count: {itemCount}</div>
      <button onClick={() => addItem('d')}>Add Item</button>
    </div>
  );
}

// Test Case 8: Actual prop drilling (TRUE POSITIVE)
interface DataProps {
  userData: { name: string; email: string };
}

function DeepChild({ userData }: DataProps) {
  return <div>{userData.name}</div>;
}

function MiddleComponent({ userData }: DataProps) {
  // This SHOULD be flagged - just passes userData without using it
  return <DeepChild userData={userData} />;
}

function ParentComponent({ userData }: DataProps) {
  // This SHOULD be flagged - just passes userData without using it
  return <MiddleComponent userData={userData} />;
}

export function PropDrillingExample() {
  const userData = { name: 'John', email: 'john@example.com' };
  return <ParentComponent userData={userData} />;
}

// Test Case 9: State passed to child component (should NOT be flagged as unused)
function ChildDisplay({ count }: { count: number }) {
  return <div>Count: {count}</div>;
}

export function StatePassedToChildExample() {
  // This should NOT be flagged - it's passed to and used by child
  const [displayCount, setDisplayCount] = useState(0);

  return (
    <div>
      <ChildDisplay count={displayCount} />
      <button onClick={() => setDisplayCount(displayCount + 1)}>Increment</button>
    </div>
  );
}

// Test Case 10: State used in multiple contexts
export function MultiContextStateExample() {
  // This should NOT be flagged - used in both effect and render
  const [hasData, setHasData] = useState(false);
  const [dualData, setDualData] = useState<any>(null);

  React.useEffect(() => {
    if (hasData) {
      console.log('Data loaded');
    }
  }, [hasData]);

  return (
    <div>
      {hasData ? <div>Data: {JSON.stringify(dualData)}</div> : <div>No data</div>}
      <button
        onClick={() => {
          setHasData(true);
          setDualData({ foo: 'bar' });
        }}
      >
        Load Data
      </button>
    </div>
  );
}
