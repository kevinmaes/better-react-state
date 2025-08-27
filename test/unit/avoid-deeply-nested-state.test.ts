import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import { avoidDeeplyNestedStateRule } from '../../src/rules/avoid-deeply-nested-state';

describe('avoidDeeplyNestedStateRule', () => {
  const parseFixture = (filename: string) => {
    const code = readFileSync(`test/fixtures/${filename}`, 'utf-8');
    return parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  };

  it('should detect deeply nested user profile state', () => {
    const ast = parseFixture('avoid-deeply-nested-state.tsx');
    const issues = avoidDeeplyNestedStateRule.check(ast, 'test.tsx');

    // Should find issue in BadUserProfile
    const userProfileIssues = issues.filter((i) => i.message.includes("'user'"));
    expect(userProfileIssues).toHaveLength(1);
    expect(userProfileIssues[0].message).toMatch(/nested 5 levels deep/);
    expect(userProfileIssues[0].suggestion).toContain('flattening');
  });

  it('should detect deeply nested app state', () => {
    const ast = parseFixture('avoid-deeply-nested-state.tsx');
    const issues = avoidDeeplyNestedStateRule.check(ast, 'test.tsx');

    // Should find issue in BadAppState
    const appStateIssues = issues.filter((i) => i.message.includes("'_appState'"));
    expect(appStateIssues).toHaveLength(1);
    expect(appStateIssues[0].message).toMatch(/nested \d+ levels deep/);
  });

  it('should not flag flattened state', () => {
    const ast = parseFixture('avoid-deeply-nested-state.tsx');
    const issues = avoidDeeplyNestedStateRule.check(ast, 'test.tsx');

    // Should not find issues in GoodUserProfile
    const goodProfileIssues = issues.filter((i) => i.message.includes("'userProfile'"));
    expect(goodProfileIssues).toHaveLength(0);
  });

  it('should not flag normalized state', () => {
    const ast = parseFixture('avoid-deeply-nested-state.tsx');
    const issues = avoidDeeplyNestedStateRule.check(ast, 'test.tsx');

    // Should not find issues in GoodNormalizedState
    const normalizedIssues = issues.filter((i) => i.message.includes("'entities'"));
    expect(normalizedIssues).toHaveLength(0);
  });

  it('should allow 2 levels of nesting', () => {
    const ast = parseFixture('avoid-deeply-nested-state.tsx');
    const issues = avoidDeeplyNestedStateRule.check(ast, 'test.tsx');

    // Should not flag AcceptableNesting (2 levels deep)
    const settingsIssues = issues.filter((i) => i.message.includes("'settings'"));
    expect(settingsIssues).toHaveLength(0);
  });

  it('should provide appropriate severity and suggestions', () => {
    const ast = parseFixture('avoid-deeply-nested-state.tsx');
    const issues = avoidDeeplyNestedStateRule.check(ast, 'test.tsx');

    const firstIssue = issues[0];
    expect(firstIssue.severity).toBe('warning');
    expect(firstIssue.rule).toBe('avoid-deeply-nested-state');
    expect(firstIssue.fixable).toBe(false); // Complex refactoring
  });
});
