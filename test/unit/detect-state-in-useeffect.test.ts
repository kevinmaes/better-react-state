import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import { detectStateInUseEffectRule } from '../../src/rules/detect-state-in-useeffect';

describe('detectStateInUseEffectRule', () => {
  const parseFixture = (filename: string) => {
    const code = readFileSync(`test/fixtures/${filename}`, 'utf-8');
    return parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  };

  it('should detect filtered list stored in state via useEffect', () => {
    const ast = parseFixture('detect-state-in-useeffect.tsx');
    const issues = detectStateInUseEffectRule.check(ast, 'test.tsx');

    const filteredIssues = issues.filter((i) => i.message.includes('filteredProducts'));
    expect(filteredIssues).toHaveLength(1);
    expect(filteredIssues[0].message).toContain('derived from other state/props');
    expect(filteredIssues[0].suggestion).toContain('compute the value during render');
  });

  it('should detect computed totals stored in state', () => {
    const ast = parseFixture('detect-state-in-useeffect.tsx');
    const issues = detectStateInUseEffectRule.check(ast, 'test.tsx');

    const totalIssues = issues.filter((i) => i.message.includes('totalPrice'));
    expect(totalIssues).toHaveLength(1);

    const countIssues = issues.filter((i) => i.message.includes('itemCount'));
    expect(countIssues).toHaveLength(1);

    const avgIssues = issues.filter((i) => i.message.includes('averagePrice'));
    expect(avgIssues).toHaveLength(1);
  });

  it('should detect formatted values stored in state', () => {
    const ast = parseFixture('detect-state-in-useeffect.tsx');
    const issues = detectStateInUseEffectRule.check(ast, 'test.tsx');

    const formattedIssues = issues.filter((i) => i.message.includes('formattedDate'));
    expect(formattedIssues).toHaveLength(1);

    const dayIssues = issues.filter((i) => i.message.includes('dayOfWeek'));
    expect(dayIssues).toHaveLength(1);
  });

  it('should detect boolean computations stored in state', () => {
    const ast = parseFixture('detect-state-in-useeffect.tsx');
    const issues = detectStateInUseEffectRule.check(ast, 'test.tsx');

    const hasCompletedIssues = issues.filter((i) => i.message.includes('hasCompletedTodos'));
    expect(hasCompletedIssues).toHaveLength(1);

    const allCompletedIssues = issues.filter((i) => i.message.includes('allCompleted'));
    expect(allCompletedIssues).toHaveLength(1);

    const percentIssues = issues.filter((i) => i.message.includes('percentComplete'));
    expect(percentIssues).toHaveLength(1);
  });

  it('should NOT flag API calls in useEffect', () => {
    const ast = parseFixture('detect-state-in-useeffect.tsx');
    const issues = detectStateInUseEffectRule.check(ast, 'test.tsx');

    // userData and loading are legitimate async operations
    const userDataIssues = issues.filter((i) => i.message.includes('userData'));
    expect(userDataIssues).toHaveLength(0);

    const loadingIssues = issues.filter(
      (i) => i.message.includes('loading') && i.message.includes('GoodAPIFetch')
    );
    expect(loadingIssues).toHaveLength(0);
  });

  it('should NOT flag localStorage operations', () => {
    const ast = parseFixture('detect-state-in-useeffect.tsx');
    const issues = detectStateInUseEffectRule.check(ast, 'test.tsx');

    const preferencesIssues = issues.filter((i) => i.message.includes('preferences'));
    expect(preferencesIssues).toHaveLength(0);
  });

  it('should NOT flag window event listeners', () => {
    const ast = parseFixture('detect-state-in-useeffect.tsx');
    const issues = detectStateInUseEffectRule.check(ast, 'test.tsx');

    const windowSizeIssues = issues.filter((i) => i.message.includes('windowSize'));
    expect(windowSizeIssues).toHaveLength(0);
  });

  it('should NOT flag timer-based updates', () => {
    const ast = parseFixture('detect-state-in-useeffect.tsx');
    const issues = detectStateInUseEffectRule.check(ast, 'test.tsx');

    const timeIssues = issues.filter(
      (i) => i.message.includes("'time'") // Note: wrapped in quotes in the message
    );
    expect(timeIssues).toHaveLength(0);
  });

  it('should NOT flag WebSocket subscriptions', () => {
    const ast = parseFixture('detect-state-in-useeffect.tsx');
    const issues = detectStateInUseEffectRule.check(ast, 'test.tsx');

    const messagesIssues = issues.filter((i) => i.message.includes('messages'));
    expect(messagesIssues).toHaveLength(0);
  });

  it('should provide fixable flag for issues', () => {
    const ast = parseFixture('detect-state-in-useeffect.tsx');
    const issues = detectStateInUseEffectRule.check(ast, 'test.tsx');

    const derivedStateIssues = issues.filter((i) => i.rule === 'detect-state-in-useeffect');

    expect(derivedStateIssues.length).toBeGreaterThan(0);
    derivedStateIssues.forEach((issue) => {
      expect(issue.fixable).toBe(true);
      expect(issue.severity).toBe('warning');
    });
  });

  it('should correctly identify all derived state patterns', () => {
    const ast = parseFixture('detect-state-in-useeffect.tsx');
    const issues = detectStateInUseEffectRule.check(ast, 'test.tsx');

    // All the bad patterns should be detected
    const expectedDerivedStates = [
      'filteredProducts',
      'totalPrice',
      'itemCount',
      'averagePrice',
      'formattedDate',
      'dayOfWeek',
      'hasCompletedTodos',
      'allCompleted',
      'someCompleted',
      'percentComplete',
    ];

    expectedDerivedStates.forEach((stateName) => {
      const found = issues.some((i) => i.message.includes(stateName));
      expect(found, `Should detect ${stateName} as derived state`).toBe(true);
    });

    // Verify we detected the right number of issues
    expect(issues).toHaveLength(expectedDerivedStates.length);
  });
});
