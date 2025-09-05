import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import { serverVsClientStateRule } from '../../src/rules/server-vs-client-state';

describe('serverVsClientStateRule', () => {
  const parseFixture = (filename: string) => {
    const code = readFileSync(`test/fixtures/${filename}`, 'utf-8');
    return parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  };

  it('should detect manual fetch with useState for loading/error/data', () => {
    const ast = parseFixture('server-vs-client-state.tsx');
    const issues = serverVsClientStateRule.check(ast, 'test.tsx');

    // Should find issue in BadManualFetch
    // The message format is: "Server data (data, isLoading, error) is managed with useState..."
    const manualFetchIssues = issues.filter(
      (i) =>
        i.message.includes('isLoading') &&
        i.message.includes('error') &&
        i.message.includes('Server data')
    );
    expect(manualFetchIssues.length).toBeGreaterThan(0);
    expect(manualFetchIssues[0].suggestion).toContain('React Query');
  });

  it('should detect axios patterns with manual state management', () => {
    const ast = parseFixture('server-vs-client-state.tsx');
    const issues = serverVsClientStateRule.check(ast, 'test.tsx');

    // Should find issue in BadAxiosPattern
    const axiosIssues = issues.filter(
      (i) => i.message.includes('products') || i.message.includes('loading')
    );
    expect(axiosIssues.length).toBeGreaterThan(0);
  });

  it('should detect multiple related server states', () => {
    const ast = parseFixture('server-vs-client-state.tsx');
    const issues = serverVsClientStateRule.check(ast, 'test.tsx');

    // Should find issues for users, posts, comments
    const multipleStateIssues = issues.filter(
      (i) =>
        i.message.includes('users') || i.message.includes('posts') || i.message.includes('comments')
    );
    expect(multipleStateIssues.length).toBeGreaterThan(0);
  });

  it('should detect GraphQL queries with manual state', () => {
    const ast = parseFixture('server-vs-client-state.tsx');
    const issues = serverVsClientStateRule.check(ast, 'test.tsx');

    // Should find issue in BadGraphQLPattern
    const graphqlIssues = issues.filter(
      (i) => i.message.includes('data') && i.line >= 102 && i.line <= 125 // Approximate location of BadGraphQLPattern
    );
    expect(graphqlIssues.length).toBeGreaterThan(0);
  });

  it('should detect async functions in useEffect', () => {
    const ast = parseFixture('server-vs-client-state.tsx');
    const issues = serverVsClientStateRule.check(ast, 'test.tsx');

    // Should find issue in BadAsyncPattern
    const asyncIssues = issues.filter(
      (i) => i.message.includes('items') || i.message.includes('fetching')
    );
    expect(asyncIssues.length).toBeGreaterThan(0);
  });

  it('should detect server data without refetch capability', () => {
    const ast = parseFixture('server-vs-client-state.tsx');
    const issues = serverVsClientStateRule.check(ast, 'test.tsx');

    // Should find issue in BadNoRefetch
    const noRefetchIssues = issues.filter((i) => i.message.includes('userData'));
    expect(noRefetchIssues.length).toBeGreaterThan(0);
  });

  it('should detect server data passed as props and stored in state', () => {
    const ast = parseFixture('server-vs-client-state.tsx');
    const issues = serverVsClientStateRule.check(ast, 'test.tsx');

    // Should find issue in BadServerDataInProps
    const propsIssues = issues.filter((i) => i.message.includes('orders'));
    expect(propsIssues.length).toBeGreaterThan(0);
  });

  it('should NOT flag React Query usage', () => {
    const ast = parseFixture('server-vs-client-state.tsx');
    const issues = serverVsClientStateRule.check(ast, 'test.tsx');

    // GoodReactQuery should not have issues
    const goodReactQueryIssues = issues.filter(
      (i) => i.line > 180 && i.line < 195 // Approximate location of GoodReactQuery
    );

    // There might be issues from other components in this range,
    // so we check that none mention useQuery patterns
    const hasUseQueryIssue = goodReactQueryIssues.some((i) => i.message.includes('useQuery'));
    expect(hasUseQueryIssue).toBe(false);
  });

  it('should NOT flag SWR usage', () => {
    const ast = parseFixture('server-vs-client-state.tsx');
    const issues = serverVsClientStateRule.check(ast, 'test.tsx');

    // GoodSWR should not have issues
    const goodSWRIssues = issues.filter(
      (i) => i.line > 195 && i.line < 210 // Approximate location of GoodSWR
    );

    const hasUseSWRIssue = goodSWRIssues.some((i) => i.message.includes('useSWR'));
    expect(hasUseSWRIssue).toBe(false);
  });

  it('should NOT flag client-only state', () => {
    const ast = parseFixture('server-vs-client-state.tsx');
    const issues = serverVsClientStateRule.check(ast, 'test.tsx');

    // GoodClientState should not have issues
    const clientStateKeywords = ['isOpen', 'selectedTab', 'searchTerm', 'theme'];

    clientStateKeywords.forEach((keyword) => {
      const hasIssue = issues.some((i) => i.message.includes(keyword));
      expect(hasIssue).toBe(false);
    });
  });

  it('should NOT flag form state', () => {
    const ast = parseFixture('server-vs-client-state.tsx');
    const issues = serverVsClientStateRule.check(ast, 'test.tsx');

    // GoodFormState should not have issues
    const formStateKeywords = ['formData', 'isSubmitting'];

    formStateKeywords.forEach((keyword) => {
      const hasIssue = issues.some(
        (i) => i.message.includes(keyword) && i.line > 260 // Approximate location of GoodFormState
      );
      expect(hasIssue).toBe(false);
    });
  });

  it('should identify all bad patterns in the fixture', () => {
    const ast = parseFixture('server-vs-client-state.tsx');
    const issues = serverVsClientStateRule.check(ast, 'test.tsx');

    // We should have at least one issue for each bad pattern (7 bad functions)
    expect(issues.length).toBeGreaterThanOrEqual(7);

    // All issues should have the correct rule name
    issues.forEach((issue) => {
      expect(issue.rule).toBe('server-vs-client-state');
      expect(issue.severity).toBe('warning');
      expect(issue.suggestion).toContain('React Query');
    });
  });
});
