import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import { formStatePatternsRule } from '../../src/rules/form-state-patterns.js';
import { groupRelatedStateRule } from '../../src/rules/group-related-state.js';

describe('Integration: form-state-patterns and group-related-state rules', () => {
  const parseFixture = (filename: string) => {
    const code = readFileSync(`test/fixtures/${filename}`, 'utf-8');
    return parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  };

  it('should not create duplicate warnings for the same useState calls', () => {
    const ast = parseFixture('form-state-patterns.tsx');

    const formPatternIssues = formStatePatternsRule.check(ast, 'test.tsx');
    const groupRelatedIssues = groupRelatedStateRule.check(ast, 'test.tsx');

    // Both rules should detect issues, but they should target different scenarios
    expect(formPatternIssues.length).toBeGreaterThan(0);
    expect(groupRelatedIssues.length).toBeGreaterThan(0);

    // Ensure rules target different thresholds
    const formPatternLines = new Set(formPatternIssues.map((i) => i.line));
    const groupRelatedLines = new Set(groupRelatedIssues.map((i) => i.line));

    // There should be minimal overlap - form-state-patterns targets 7+ states,
    // group-related-state targets 2+ states, so some overlap is expected but limited
    const intersection = new Set([...formPatternLines].filter((x) => groupRelatedLines.has(x)));

    // Most issues should be from different rules targeting different complexity levels
    expect(intersection.size).toBeLessThan(Math.max(formPatternLines.size, groupRelatedLines.size));
  });

  it('should provide complementary suggestions', () => {
    const ast = parseFixture('form-state-patterns.tsx');

    const formPatternIssues = formStatePatternsRule.check(ast, 'test.tsx');
    const groupRelatedIssues = groupRelatedStateRule.check(ast, 'test.tsx');

    // form-state-patterns should suggest form libraries for complex forms
    const formLibrarySuggestions = formPatternIssues.filter(
      (i) =>
        i.suggestion &&
        (i.suggestion.includes('React Hook Form') || i.suggestion.includes('TanStack Form'))
    );
    expect(formLibrarySuggestions.length).toBeGreaterThan(0);

    // group-related-state should suggest basic state grouping
    const basicGroupingSuggestions = groupRelatedIssues.filter(
      (i) => i.suggestion && i.suggestion.includes('useState({')
    );
    expect(basicGroupingSuggestions.length).toBeGreaterThan(0);
  });

  it('should target different complexity levels appropriately', () => {
    // Create a test case with exactly 5 form fields to test the boundary
    const testCode = `
      import React, { useState } from 'react';
      
      function MediumComplexityForm() {
        const [firstName, setFirstName] = useState('');
        const [lastName, setLastName] = useState('');
        const [email, setEmail] = useState('');
        const [phone, setPhone] = useState('');
        const [address, setAddress] = useState('');
        
        return (
          <form>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} />
            <input value={lastName} onChange={e => setLastName(e.target.value)} />
            <input value={email} onChange={e => setEmail(e.target.value)} />
            <input value={phone} onChange={e => setPhone(e.target.value)} />
            <input value={address} onChange={e => setAddress(e.target.value)} />
          </form>
        );
      }
    `;

    const ast = parse(testCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    const formPatternIssues = formStatePatternsRule.check(ast, 'test.tsx');
    const groupRelatedIssues = groupRelatedStateRule.check(ast, 'test.tsx');

    // With 5 form fields:
    // - group-related-state should detect it (2+ related states)
    // - form-state-patterns should NOT detect it (needs 7+ form states)
    expect(groupRelatedIssues.length).toBe(1);
    expect(formPatternIssues.length).toBe(0);
  });

  it('should both detect very complex forms but with different suggestions', () => {
    // Create a test case with 8 form fields to ensure both rules trigger
    const testCode = `
      import React, { useState } from 'react';
      
      function VeryComplexForm() {
        const [firstName, setFirstName] = useState('');
        const [lastName, setLastName] = useState('');
        const [email, setEmail] = useState('');
        const [phone, setPhone] = useState('');
        const [address, setAddress] = useState('');
        const [city, setCity] = useState('');
        const [state, setState] = useState('');
        const [zipCode, setZipCode] = useState('');
        
        return (
          <form>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} />
            {/* ... other inputs */}
          </form>
        );
      }
    `;

    const ast = parse(testCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    const formPatternIssues = formStatePatternsRule.check(ast, 'test.tsx');
    const groupRelatedIssues = groupRelatedStateRule.check(ast, 'test.tsx');

    // Both should detect this case
    expect(formPatternIssues.length).toBe(1);
    expect(groupRelatedIssues.length).toBe(1);

    // But they should provide different suggestions
    const formPatternSuggestion = formPatternIssues[0].suggestion;
    const groupRelatedSuggestion = groupRelatedIssues[0].suggestion;

    expect(formPatternSuggestion).toBeDefined();
    expect(groupRelatedSuggestion).toBeDefined();
    expect(formPatternSuggestion).not.toBe(groupRelatedSuggestion);

    // form-state-patterns should suggest form libraries
    expect(formPatternSuggestion).toMatch(/React Hook Form|TanStack Form|useReducer/);

    // group-related-state should suggest basic grouping
    expect(groupRelatedSuggestion).toContain('useState({');
  });

  it('should handle validation states appropriately', () => {
    const testCode = `
      import React, { useState } from 'react';
      
      function FormWithValidation() {
        // 3 form fields
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [name, setName] = useState('');
        
        // 4 validation states
        const [emailError, setEmailError] = useState('');
        const [passwordError, setPasswordError] = useState('');
        const [touched, setTouched] = useState(false);
        const [isValid, setIsValid] = useState(false);
        
        return <form>{/* ... */}</form>;
      }
    `;

    const ast = parse(testCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    const formPatternIssues = formStatePatternsRule.check(ast, 'test.tsx');
    const groupRelatedIssues = groupRelatedStateRule.check(ast, 'test.tsx');

    // form-state-patterns should detect this (3 fields + 4 validation = 7 total)
    expect(formPatternIssues.length).toBe(1);

    // group-related-state should also detect related states
    expect(groupRelatedIssues.length).toBeGreaterThanOrEqual(1);

    // Suggestions should be different and appropriate
    const formPatternSuggestion = formPatternIssues[0].suggestion;
    expect(formPatternSuggestion).toContain('validation');
  });
});
