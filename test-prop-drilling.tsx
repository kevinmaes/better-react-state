import React, { useState } from 'react';

// ============================================
// EXAMPLE 1: 2-Level Drilling (WARNING)
// ============================================
function _App() {
  const [userData, setUserData] = useState({ name: 'Alice' });
  return <Level1Warning userData={userData} onUpdate={setUserData} />;
}

function Level1Warning({ userData, onUpdate }) {
  // Just passes props, doesn't use them - THIS IS THE DRILL
  return <Level2Warning userData={userData} onUpdate={onUpdate} />;
}

function Level2Warning({ userData, onUpdate }) {
  // Finally uses the props
  return (
    <div>
      {userData.name}
      <button onClick={() => onUpdate({ name: 'Bob' })}>Update</button>
    </div>
  );
}

// ============================================
// EXAMPLE 2: 3-Level Drilling (ERROR)
// ============================================
function _DeepApp() {
  const [config, setConfig] = useState({ theme: 'dark' });
  return <Level1Error config={config} onConfigChange={setConfig} />;
}

function Level1Error({ config, onConfigChange }) {
  // Doesn't use props - DRILL #1
  return <Level2Error config={config} onConfigChange={onConfigChange} />;
}

function Level2Error({ config, onConfigChange }) {
  // Still doesn't use props - DRILL #2
  return <Level3Error config={config} onConfigChange={onConfigChange} />;
}

function Level3Error({ config, onConfigChange }) {
  // Finally uses the props after 2 intermediate components
  return (
    <div>
      Theme: {config.theme}
      <button onClick={() => onConfigChange({ theme: 'light' })}>Toggle</button>
    </div>
  );
}

// ============================================
// EXAMPLE 3: NO DRILLING (Good Pattern)
// ============================================
function _GoodApp() {
  const [data, setData] = useState({ value: 42 });
  return <GoodLevel1 data={data} onUpdate={setData} />;
}

function GoodLevel1({ data, onUpdate }) {
  // Actually USES the data prop here
  const doubled = data.value * 2;

  return (
    <div>
      <p>Doubled: {doubled}</p>
      <GoodLevel2 data={data} onUpdate={onUpdate} />
    </div>
  );
}

function GoodLevel2({ data, onUpdate }) {
  // Also uses the props - no drilling!
  return (
    <div>
      Value: {data.value}
      <button onClick={() => onUpdate({ value: data.value + 1 })}>+</button>
    </div>
  );
}
