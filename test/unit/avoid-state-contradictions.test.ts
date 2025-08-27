import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import { avoidStateContradictionsRule } from '../../src/rules/avoid-state-contradictions';

describe('avoidStateContradictionsRule', () => {
  const parseFixture = (filename: string) => {
    const code = readFileSync(`test/fixtures/${filename}`, 'utf-8');
    return parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  };

  it('should detect contradictory loading states', () => {
    const ast = parseFixture('avoid-state-contradictions.tsx');
    const issues = avoidStateContradictionsRule.check(ast, 'test.tsx');

    // Should find issues in BadDataFetcher
    const loadingIssues = issues.filter((i) => i.message.includes('isLoading'));
    expect(loadingIssues.length).toBeGreaterThan(0);
    expect(loadingIssues[0].severity).toBe('error');
    expect(loadingIssues[0].suggestion).toContain('useState<');
  });

  it('should detect contradictory modal states', () => {
    const ast = parseFixture('avoid-state-contradictions.tsx');
    const issues = avoidStateContradictionsRule.check(ast, 'test.tsx');

    // Should find issues in BadModal
    const modalIssues = issues.filter(
      (i) => i.message.includes('isOpen') || i.message.includes('isClosed')
    );
    expect(modalIssues.length).toBeGreaterThan(0);
  });

  it('should not flag proper state machines', () => {
    const ast = parseFixture('avoid-state-contradictions.tsx');
    const issues = avoidStateContradictionsRule.check(ast, 'test.tsx');

    // Should not find issues with 'status' state
    const statusIssues = issues.filter((i) => i.message.includes('status'));
    expect(statusIssues).toHaveLength(0);
  });
});
