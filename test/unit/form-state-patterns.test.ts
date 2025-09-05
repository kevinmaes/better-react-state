import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import { formStatePatternsRule } from '../../src/rules/form-state-patterns.js';

describe('formStatePatternsRule', () => {
  const parseFixture = (filename: string) => {
    const code = readFileSync(`test/fixtures/${filename}`, 'utf-8');
    return parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  };

  it('should detect complex registration form with 7+ states (warning)', () => {
    const ast = parseFixture('form-state-patterns.tsx');
    const issues = formStatePatternsRule.check(ast, 'test.tsx');

    // Should find warning in ComplexRegistrationForm (first form with manual reset)
    const complexFormIssues = issues.filter(
      (i) =>
        i.message.includes('form-related state variables') &&
        i.message.includes('Manual reset pattern detected') &&
        i.severity === 'warning'
    );
    expect(complexFormIssues).toHaveLength(1);
    expect(complexFormIssues[0].message).toMatch(/11 form-related state variables/);
    expect(complexFormIssues[0].message).toContain('Manual reset pattern detected');
    expect(complexFormIssues[0].suggestion).toContain('React Hook Form');
  });

  it('should detect very complex form with 12+ states (error)', () => {
    const ast = parseFixture('form-state-patterns.tsx');
    const issues = formStatePatternsRule.check(ast, 'test.tsx');

    // Should find error in VeryComplexForm
    const veryComplexIssues = issues.filter((i) => i.severity === 'error');
    expect(veryComplexIssues).toHaveLength(1);
    expect(veryComplexIssues[0].message).toMatch(/16 form-related state variables/);
    expect(veryComplexIssues[0].suggestion).toContain('React Hook Form for better performance');
  });

  it('should detect form with validation patterns', () => {
    const ast = parseFixture('form-state-patterns.tsx');
    const issues = formStatePatternsRule.check(ast, 'test.tsx');

    // Should find issue in FormWithValidation (look for the one with 11 states)
    const validationFormIssues = issues.filter(
      (i) =>
        i.message.includes('11 form-related state variables') &&
        !i.message.includes('Manual reset pattern detected')
    );

    expect(validationFormIssues).toHaveLength(1);

    // The suggestion should mention validation or form libraries
    const validationIssue = validationFormIssues[0];
    expect(validationIssue.suggestion).toContain('React Hook Form');
  });

  it('should detect shipping/billing form patterns', () => {
    const ast = parseFixture('form-state-patterns.tsx');
    const issues = formStatePatternsRule.check(ast, 'test.tsx');

    // Should find issue in ShippingBillingForm
    const shippingBillingIssues = issues.filter((i) =>
      i.message.includes('form-related state variables')
    );

    expect(shippingBillingIssues.length).toBeGreaterThanOrEqual(1);
  });

  it('should not flag simple forms with few states', () => {
    const ast = parseFixture('form-state-patterns.tsx');
    const issues = formStatePatternsRule.check(ast, 'test.tsx');

    // Should not flag SimpleContactForm (only 4 states, 3 form fields)
    const simpleFormIssues = issues.filter(
      (i) => i.line && i.line > 100 && i.line < 120 // approximate line range for SimpleContactForm
    );

    // The simple form should not trigger any issues
    expect(simpleFormIssues).toHaveLength(0);
  });

  it('should not flag grouped state approaches', () => {
    const ast = parseFixture('form-state-patterns.tsx');
    const issues = formStatePatternsRule.check(ast, 'test.tsx');

    // Should not flag GroupedStateForm (uses single state object)
    const groupedFormIssues = issues.filter(
      (i) => i.line && i.line > 120 && i.line < 150 // approximate line range for GroupedStateForm
    );

    expect(groupedFormIssues).toHaveLength(0);
  });

  it('should not flag mixed non-form states', () => {
    const ast = parseFixture('form-state-patterns.tsx');
    const issues = formStatePatternsRule.check(ast, 'test.tsx');

    // Should not flag MixedStatesComponent (has non-form states)
    const mixedStatesIssues = issues.filter(
      (i) => i.line && i.line > 150 && i.line < 180 // approximate line range for MixedStatesComponent
    );

    expect(mixedStatesIssues).toHaveLength(0);
  });

  it('should provide appropriate suggestions based on complexity', () => {
    const ast = parseFixture('form-state-patterns.tsx');
    const issues = formStatePatternsRule.check(ast, 'test.tsx');

    const allIssues = issues.filter((i) => i.rule === 'form-state-patterns');

    // Check that different complexity levels get different suggestions
    const errorIssues = allIssues.filter((i) => i.severity === 'error');
    const warningIssues = allIssues.filter((i) => i.severity === 'warning');

    expect(errorIssues.length).toBeGreaterThanOrEqual(1);
    expect(warningIssues.length).toBeGreaterThanOrEqual(1);

    // Error suggestions should mention performance
    expect(errorIssues[0].suggestion).toContain('performance');

    // Warning suggestions should provide alternatives
    expect(warningIssues[0].suggestion).toContain('React Hook Form');
  });

  it('should identify form fields correctly', () => {
    const ast = parseFixture('form-state-patterns.tsx');
    const issues = formStatePatternsRule.check(ast, 'test.tsx');

    const formIssues = issues.filter((i) => i.rule === 'form-state-patterns');

    // Should detect various form field patterns
    expect(formIssues.length).toBeGreaterThanOrEqual(3); // Multiple complex forms in fixture

    // Each issue should be fixable
    formIssues.forEach((issue) => {
      expect(issue.fixable).toBe(true);
    });
  });

  it('should identify validation state patterns', () => {
    const ast = parseFixture('form-state-patterns.tsx');
    const issues = formStatePatternsRule.check(ast, 'test.tsx');

    // FormWithValidation should be detected due to validation states
    const validationIssues = issues.filter(
      (i) =>
        i.message.includes('form-related state variables') &&
        i.suggestion &&
        (i.suggestion.includes('validation') || i.suggestion.includes('React Hook Form'))
    );

    expect(validationIssues.length).toBeGreaterThanOrEqual(1);
  });
});
