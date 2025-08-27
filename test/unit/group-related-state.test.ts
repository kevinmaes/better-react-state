import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import { groupRelatedStateRule } from '../../src/rules/group-related-state';

describe('groupRelatedStateRule', () => {
  const parseFixture = (filename: string) => {
    const code = readFileSync(`test/fixtures/${filename}`, 'utf-8');
    return parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  };

  it('should detect related form fields', () => {
    const ast = parseFixture('group-related-state.tsx');
    const issues = groupRelatedStateRule.check(ast, 'test.tsx');

    // Should find issues in BadUserForm
    const userFormIssues = issues.filter((i) => i.message.includes('firstName'));
    expect(userFormIssues).toHaveLength(1);
    expect(userFormIssues[0].message).toMatch(/4 related state variables/);
    expect(userFormIssues[0].suggestion).toContain('useState({');
  });

  it('should detect related product state', () => {
    const ast = parseFixture('group-related-state.tsx');
    const issues = groupRelatedStateRule.check(ast, 'test.tsx');

    // Should find issues in BadProductCard
    const productIssues = issues.filter((i) => i.message.includes('product'));
    expect(productIssues).toHaveLength(1);
    expect(productIssues[0].message).toMatch(/3 related state variables/);
  });

  it('should not flag already grouped state', () => {
    const ast = parseFixture('group-related-state.tsx');
    const issues = groupRelatedStateRule.check(ast, 'test.tsx');

    // Should not find issues in GoodUserForm
    const goodFormIssues = issues.filter((i) => i.message.includes('user'));
    expect(goodFormIssues).toHaveLength(0);
  });
});
