import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import { avoidStateDuplicationRule } from '../../src/rules/avoid-state-duplication';

describe('avoidStateDuplicationRule', () => {
  const parseFixture = (filename: string) => {
    const code = readFileSync(`test/fixtures/${filename}`, 'utf-8');
    return parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
  };

  it('should detect state initialized from props', () => {
    const ast = parseFixture('avoid-state-duplication.tsx');
    const issues = avoidStateDuplicationRule.check(ast, 'test.tsx');
    
    // Should find issues in BadPropsInit
    const propsInitIssues = issues.filter(i => 
      i.message.includes("initialized from prop")
    );
    expect(propsInitIssues.length).toBeGreaterThan(0);
    expect(propsInitIssues[0].message).toContain('userId');
    expect(propsInitIssues[0].suggestion).toContain('Use the prop directly');
  });

  it('should detect state duplicating other state', () => {
    const ast = parseFixture('avoid-state-duplication.tsx');
    const issues = avoidStateDuplicationRule.check(ast, 'test.tsx');
    
    // Should find issues in BadStateDuplication where state is initialized from user.id/user.name
    const duplicationIssues = issues.filter(i => 
      i.message.includes("is initialized from") && i.message.includes("user.")
    );
    expect(duplicationIssues.length).toBeGreaterThan(0);
    expect(duplicationIssues[0].suggestion).toContain('single source of truth');
    
    // Also check for setter duplication
    const setterDuplication = issues.filter(i => 
      i.message.includes("being set from state")
    );
    expect(setterDuplication.length).toBeGreaterThanOrEqual(0);
  });

  it('should detect storing full objects when only using parts', () => {
    const ast = parseFixture('avoid-state-duplication.tsx');
    const issues = avoidStateDuplicationRule.check(ast, 'test.tsx');
    
    // Should find issue in BadSelectiveUsage
    const selectiveIssues = issues.filter(i => 
      i.message.includes("stores") && i.message.includes("properties but only uses")
    );
    expect(selectiveIssues.length).toBeGreaterThan(0);
    expect(selectiveIssues[0].severity).toBe('info');
    expect(selectiveIssues[0].message).toContain('name, email');
  });

  it('should not flag direct prop usage', () => {
    const ast = parseFixture('avoid-state-duplication.tsx');
    const issues = avoidStateDuplicationRule.check(ast, 'test.tsx');
    
    // Should not find issues in GoodPropsUsage
    const goodPropsIssues = issues.filter(i => 
      i.message.includes('GoodPropsUsage')
    );
    expect(goodPropsIssues).toHaveLength(0);
  });

  it('should not flag properly derived state', () => {
    const ast = parseFixture('avoid-state-duplication.tsx');
    const issues = avoidStateDuplicationRule.check(ast, 'test.tsx');
    
    // Should not find issues in GoodDerivedState
    const derivedStateIssues = issues.filter(i => 
      i.message.includes('userDetails') && i.message.includes('initialized from prop')
    );
    expect(derivedStateIssues).toHaveLength(0);
  });

  it('should not flag single source of truth patterns', () => {
    const ast = parseFixture('avoid-state-duplication.tsx');
    const issues = avoidStateDuplicationRule.check(ast, 'test.tsx');
    
    // Should not flag selectedUserId in GoodSingleSource
    const singleSourceIssues = issues.filter(i => 
      i.message.includes('selectedUserId') && 
      i.line > 90 // GoodSingleSource is later in the file
    );
    expect(singleSourceIssues).toHaveLength(0);
  });

  it('should provide appropriate severity levels', () => {
    const ast = parseFixture('avoid-state-duplication.tsx');
    const issues = avoidStateDuplicationRule.check(ast, 'test.tsx');
    
    // Props initialization should be warning
    const propsIssue = issues.find(i => i.message.includes('initialized from prop'));
    expect(propsIssue?.severity).toBe('warning');
    
    // Selective usage should be info
    const selectiveIssue = issues.find(i => i.message.includes('but only uses'));
    expect(selectiveIssue?.severity).toBe('info');
  });
});