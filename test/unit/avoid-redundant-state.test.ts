import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import { avoidRedundantStateRule } from '../../src/rules/avoid-redundant-state';

describe('avoidRedundantStateRule', () => {
  const parseFixture = (filename: string) => {
    const code = readFileSync(`test/fixtures/${filename}`, 'utf-8');
    return parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
  };

  it('should detect computed total price state', () => {
    const ast = parseFixture('avoid-redundant-state.tsx');
    const issues = avoidRedundantStateRule.check(ast, 'test.tsx');
    
    // Should find totalPrice as redundant
    const priceIssues = issues.filter(i => i.message.includes('totalPrice'));
    expect(priceIssues.length).toBeGreaterThan(0);
    expect(priceIssues[0].suggestion).toContain('computing this value during render');
  });

  it('should detect computed count state', () => {
    const ast = parseFixture('avoid-redundant-state.tsx');
    const issues = avoidRedundantStateRule.check(ast, 'test.tsx');
    
    // Should find itemCount as redundant
    const countIssues = issues.filter(i => i.message.includes('itemCount'));
    expect(countIssues.length).toBeGreaterThan(0);
  });

  it('should detect formatted values stored in state', () => {
    const ast = parseFixture('avoid-redundant-state.tsx');
    const issues = avoidRedundantStateRule.check(ast, 'test.tsx');
    
    // Should find formattedDate as redundant
    const formatIssues = issues.filter(i => i.message.includes('formattedDate'));
    expect(formatIssues.length).toBeGreaterThan(0);
  });

  it('should not flag non-redundant state', () => {
    const ast = parseFixture('avoid-redundant-state.tsx');
    const issues = avoidRedundantStateRule.check(ast, 'test.tsx');
    
    // Should not flag 'items' state itself
    const itemsIssues = issues.filter(i => i.message.includes("'items'"));
    expect(itemsIssues).toHaveLength(0);
  });
});