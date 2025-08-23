import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import { preferExplicitTransitionsRule } from '../../src/rules/prefer-explicit-transitions';

describe('preferExplicitTransitionsRule', () => {
  const parseFixture = (filename: string) => {
    const code = readFileSync(`test/fixtures/${filename}`, 'utf-8');
    return parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
  };

  it('should detect multiple states updated together', () => {
    const ast = parseFixture('prefer-explicit-transitions.tsx');
    const issues = preferExplicitTransitionsRule.check(ast, 'test.tsx');
    
    // Should find issue in BadFormWithMultipleStates
    const formIssues = issues.filter(i => 
      i.message.includes('6 state variables with complex update patterns')
    );
    expect(formIssues).toHaveLength(1);
    expect(formIssues[0].severity).toBe('info');
    expect(formIssues[0].suggestion).toContain('useReducer');
  });

  it('should detect complex conditional state logic', () => {
    const ast = parseFixture('prefer-explicit-transitions.tsx');
    const issues = preferExplicitTransitionsRule.check(ast, 'test.tsx');
    
    // Should find issue in BadConditionalStateUpdates
    const conditionalIssues = issues.filter(i => 
      i.message.includes('4 state variables with complex update patterns')
    );
    expect(conditionalIssues).toHaveLength(1);
    expect(conditionalIssues[0].line).toBeGreaterThan(50); // After the first component
  });

  it('should not flag components already using useReducer', () => {
    const ast = parseFixture('prefer-explicit-transitions.tsx');
    const issues = preferExplicitTransitionsRule.check(ast, 'test.tsx');
    
    // Should not find issues in GoodFormWithReducer
    const reducerIssues = issues.filter(i => 
      i.line >= 146 && i.line <= 177 // GoodFormWithReducer range
    );
    expect(reducerIssues).toHaveLength(0);
  });

  it('should not flag simple components', () => {
    const ast = parseFixture('prefer-explicit-transitions.tsx');
    const issues = preferExplicitTransitionsRule.check(ast, 'test.tsx');
    
    // Should not find issues in GoodSimpleComponent
    const simpleIssues = issues.filter(i => 
      i.line >= 180 // GoodSimpleComponent starts here
    );
    expect(simpleIssues).toHaveLength(0);
  });

  it('should detect when 4+ state variables exist', () => {
    // Create a test case with exactly 4 state variables
    const code = `
      import React, { useState } from 'react';
      
      export function ComponentWithFourStates() {
        const [state1, setState1] = useState('');
        const [state2, setState2] = useState(0);
        const [state3, setState3] = useState(false);
        const [state4, setState4] = useState([]);
        
        return <div />;
      }
    `;
    
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
    
    const issues = preferExplicitTransitionsRule.check(ast, 'test.tsx');
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('4 state variables');
  });

  it('should detect related state updates', () => {
    const code = `
      import React, { useState } from 'react';
      
      export function ComponentWithRelatedUpdates() {
        const [loading, setLoading] = useState(false);
        const [data, setData] = useState(null);
        const [error, setError] = useState(null);
        
        const handleFetch = async () => {
          setLoading(true);
          setError(null);
          
          try {
            const result = await fetch('/api');
            setData(await result.json());
            setLoading(false);
          } catch (err) {
            setError(err);
            setLoading(false);
          }
        };
        
        return <button onClick={handleFetch}>Fetch</button>;
      }
    `;
    
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
    
    const issues = preferExplicitTransitionsRule.check(ast, 'test.tsx');
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('complex update patterns');
  });

  it('should provide info severity for all issues', () => {
    const ast = parseFixture('prefer-explicit-transitions.tsx');
    const issues = preferExplicitTransitionsRule.check(ast, 'test.tsx');
    
    // All issues should be info level
    issues.forEach(issue => {
      expect(issue.severity).toBe('info');
    });
  });

  it('should suggest useReducer in all cases', () => {
    const ast = parseFixture('prefer-explicit-transitions.tsx');
    const issues = preferExplicitTransitionsRule.check(ast, 'test.tsx');
    
    // All issues should suggest useReducer
    issues.forEach(issue => {
      expect(issue.suggestion).toContain('useReducer');
      expect(issue.suggestion).toContain('explicit and predictable');
    });
  });
});