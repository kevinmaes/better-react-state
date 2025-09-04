import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import { stateVsRefsRule } from '../../src/rules/state-vs-refs';

describe('stateVsRefsRule', () => {
  const parseFixture = (filename: string) => {
    const code = readFileSync(`test/fixtures/${filename}`, 'utf-8');
    return parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  };

  it('should detect timer IDs stored in state', () => {
    const ast = parseFixture('state-vs-refs.tsx');
    const issues = stateVsRefsRule.check(ast, 'test.tsx');

    const intervalIdIssues = issues.filter((i) => i.message.includes('intervalId'));
    expect(intervalIdIssues).toHaveLength(1);
    expect(intervalIdIssues[0].message).toContain("doesn't affect render output");
    expect(intervalIdIssues[0].suggestion).toContain(
      'Timer updates cause unnecessary component re-renders'
    );

    const timerIdIssues = issues.filter((i) => i.message.includes('timerId'));
    expect(timerIdIssues).toHaveLength(1);
    expect(timerIdIssues[0].suggestion).toContain(
      'Timer updates cause unnecessary component re-renders'
    );
  });

  it('should detect previous values stored in state', () => {
    const ast = parseFixture('state-vs-refs.tsx');
    const issues = stateVsRefsRule.check(ast, 'test.tsx');

    const previousValueIssues = issues.filter((i) => i.message.includes('previousValue'));
    expect(previousValueIssues).toHaveLength(1);
    expect(previousValueIssues[0].suggestion).toContain('Previous value tracking for comparisons');

    const lastUpdateIssues = issues.filter((i) => i.message.includes('lastUpdate'));
    expect(lastUpdateIssues).toHaveLength(1);
  });

  it('should detect click counters that are not displayed', () => {
    const ast = parseFixture('state-vs-refs.tsx');
    const issues = stateVsRefsRule.check(ast, 'test.tsx');

    const clickCountIssues = issues.filter((i) => i.message.includes('clickCount'));
    expect(clickCountIssues).toHaveLength(1);
    expect(clickCountIssues[0].suggestion).toContain('Counter updates trigger re-renders');

    const totalClicksIssues = issues.filter((i) => i.message.includes('totalClicks'));
    expect(totalClicksIssues).toHaveLength(1);
  });

  it('should detect DOM element references stored in state', () => {
    const ast = parseFixture('state-vs-refs.tsx');
    const issues = stateVsRefsRule.check(ast, 'test.tsx');

    const inputElementIssues = issues.filter((i) => i.message.includes('inputElement'));
    expect(inputElementIssues).toHaveLength(1);
    expect(inputElementIssues[0].suggestion).toContain('DOM element references should use useRef');
  });

  it('should detect tracking state that is never displayed', () => {
    const ast = parseFixture('state-vs-refs.tsx');
    const issues = stateVsRefsRule.check(ast, 'test.tsx');

    const renderCountIssues = issues.filter((i) => i.message.includes('renderCount'));
    expect(renderCountIssues).toHaveLength(1);

    const mountTimeIssues = issues.filter((i) => i.message.includes('mountTime'));
    expect(mountTimeIssues).toHaveLength(1);
  });

  it('should detect mixed usage - debug and position state not displayed', () => {
    const ast = parseFixture('state-vs-refs.tsx');
    const issues = stateVsRefsRule.check(ast, 'test.tsx');

    const debugCountIssues = issues.filter((i) => i.message.includes('debugCount'));
    expect(debugCountIssues).toHaveLength(1);

    const positionIssues = issues.filter((i) => i.message.includes('position'));
    expect(positionIssues).toHaveLength(1);
  });

  it('should NOT flag legitimate useState usage that affects render', () => {
    const ast = parseFixture('state-vs-refs.tsx');
    const issues = stateVsRefsRule.check(ast, 'test.tsx');

    // These should not be flagged as they are used in render
    const countIssues = issues.filter((i) => i.message.includes("State 'count'"));
    expect(countIssues).toHaveLength(0);

    const isVisibleIssues = issues.filter((i) => i.message.includes("State 'isVisible'"));
    expect(isVisibleIssues).toHaveLength(0);

    const messageIssues = issues.filter((i) => i.message.includes("State 'message'"));
    expect(messageIssues).toHaveLength(0);

    const displayCountIssues = issues.filter((i) => i.message.includes("State 'displayCount'"));
    expect(displayCountIssues).toHaveLength(0);
  });

  it('should have correct rule properties', () => {
    expect(stateVsRefsRule.name).toBe('state-vs-refs');
    expect(stateVsRefsRule.description).toContain('useRef instead of useState');
    expect(stateVsRefsRule.severity).toBe('warning');
  });

  it('should provide performance-focused suggestions', () => {
    const ast = parseFixture('state-vs-refs.tsx');
    const issues = stateVsRefsRule.check(ast, 'test.tsx');

    // Check that suggestions mention performance benefits
    const timerIssue = issues.find((i) => i.message.includes('timerId'));
    expect(timerIssue?.suggestion).toContain(
      'Timer updates cause unnecessary component re-renders'
    );

    const refIssue = issues.find((i) => i.message.includes('inputElement'));
    expect(refIssue?.suggestion).toContain('DOM element references should use useRef');

    const countIssue = issues.find((i) => i.message.includes('clickCount'));
    expect(countIssue?.suggestion).toContain('Counter updates trigger re-renders');
  });

  it('should mark issues as fixable', () => {
    const ast = parseFixture('state-vs-refs.tsx');
    const issues = stateVsRefsRule.check(ast, 'test.tsx');

    // All detected issues should be marked as fixable
    const flaggedIssues = issues.filter(
      (issue) =>
        issue.message.includes('intervalId') ||
        issue.message.includes('timerId') ||
        issue.message.includes('previousValue') ||
        issue.message.includes('clickCount') ||
        issue.message.includes('inputElement')
    );

    expect(flaggedIssues.length).toBeGreaterThan(0);
    flaggedIssues.forEach((issue) => {
      expect(issue.fixable).toBe(true);
    });
  });

  it('should provide correct line and column information', () => {
    const ast = parseFixture('state-vs-refs.tsx');
    const issues = stateVsRefsRule.check(ast, 'test.tsx');

    const timerIssue = issues.find((i) => i.message.includes('intervalId'));
    expect(timerIssue?.line).toBeGreaterThan(0);
    expect(timerIssue?.column).toBeGreaterThan(0);
    expect(timerIssue?.file).toBe('test.tsx');
  });

  it('should identify different naming patterns correctly', () => {
    const ast = parseFixture('state-vs-refs.tsx');
    const issues = stateVsRefsRule.check(ast, 'test.tsx');

    // Timer patterns
    const timerPatternIssues = issues.filter(
      (i) => i.message.includes('intervalId') || i.message.includes('timerId')
    );
    expect(timerPatternIssues.length).toBe(2);

    // Previous value patterns
    const prevPatternIssues = issues.filter(
      (i) => i.message.includes('previousValue') || i.message.includes('lastUpdate')
    );
    expect(prevPatternIssues.length).toBe(2);

    // Count patterns
    const countPatternIssues = issues.filter(
      (i) =>
        i.message.includes('clickCount') ||
        i.message.includes('totalClicks') ||
        i.message.includes('renderCount') ||
        i.message.includes('debugCount')
    );
    expect(countPatternIssues.length).toBe(4);

    // Element patterns
    const elementPatternIssues = issues.filter((i) => i.message.includes('inputElement'));
    expect(elementPatternIssues.length).toBe(1);
  });
});
