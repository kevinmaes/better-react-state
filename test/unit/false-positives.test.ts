import { describe, it, expect } from 'vitest';
import { analyzer } from '../../src/analyzer/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('False Positive Prevention Tests', () => {
  const fixturesDir = path.join(__dirname, '../fixtures');

  describe('State vs Refs Detection', () => {
    it('should NOT flag state used in Context Provider values', async () => {
      const result = await analyzer.analyze(fixturesDir, {
        pattern: '**/false-positives.tsx',
        ignore: [],
        format: 'json',
        fix: false,
        strict: false,
        verbose: false,
      });
      const stateVsRefsIssues = result.issues.filter((i) => i.rule === 'state-vs-refs');

      // privacyMode should not be flagged
      const privacyModeIssue = stateVsRefsIssues.find((i) => i.message.includes("'privacyMode'"));
      expect(privacyModeIssue).toBeUndefined();
    });

    it('should NOT flag state used in computed values that affect rendering', async () => {
      const result = await analyzer.analyze(fixturesDir, {
        pattern: '**/false-positives.tsx',
        ignore: [],
        format: 'json',
        fix: false,
        strict: false,
        verbose: false,
      });
      const stateVsRefsIssues = result.issues.filter((i) => i.rule === 'state-vs-refs');

      // sliderWidth should not be flagged
      const sliderWidthIssue = stateVsRefsIssues.find((i) => i.message.includes("'sliderWidth'"));
      expect(sliderWidthIssue).toBeUndefined();
    });

    it('should NOT flag state used in conditional rendering', async () => {
      const result = await analyzer.analyze(fixturesDir, {
        pattern: '**/false-positives.tsx',
        ignore: [],
        format: 'json',
        fix: false,
        strict: false,
        verbose: false,
      });
      const stateVsRefsIssues = result.issues.filter((i) => i.rule === 'state-vs-refs');

      // visibleCounts should not be flagged
      const visibleCountsIssue = stateVsRefsIssues.find((i) =>
        i.message.includes("'visibleCounts'")
      );
      expect(visibleCountsIssue).toBeUndefined();
    });

    it('should NOT flag state passed to child components', async () => {
      const result = await analyzer.analyze(fixturesDir, {
        pattern: '**/false-positives.tsx',
        ignore: [],
        format: 'json',
        fix: false,
        strict: false,
        verbose: false,
      });
      const stateVsRefsIssues = result.issues.filter((i) => i.rule === 'state-vs-refs');

      // displayCount should not be flagged
      const displayCountIssue = stateVsRefsIssues.find((i) => i.message.includes("'displayCount'"));
      expect(displayCountIssue).toBeUndefined();
    });

    it('should NOT flag state used in multiple contexts', async () => {
      const result = await analyzer.analyze(fixturesDir, {
        pattern: '**/false-positives.tsx',
        ignore: [],
        format: 'json',
        fix: false,
        strict: false,
        verbose: false,
      });
      const stateVsRefsIssues = result.issues.filter((i) => i.rule === 'state-vs-refs');

      // hasData and dualData should not be flagged
      const hasDataIssue = stateVsRefsIssues.find((i) => i.message.includes("'hasData'"));
      const dualDataIssue = stateVsRefsIssues.find((i) => i.message.includes("'dualData'"));
      expect(hasDataIssue).toBeUndefined();
      expect(dualDataIssue).toBeUndefined();
    });

    it('SHOULD flag state that never affects render output', async () => {
      const result = await analyzer.analyze(fixturesDir, {
        pattern: '**/false-positives.tsx',
        ignore: [],
        format: 'json',
        fix: false,
        strict: false,
        verbose: false,
      });
      const stateVsRefsIssues = result.issues.filter((i) => i.rule === 'state-vs-refs');

      // timerId and previousValue should be flagged
      const timerIdIssue = stateVsRefsIssues.find((i) => i.message.includes("'timerId'"));
      const previousValueIssue = stateVsRefsIssues.find((i) =>
        i.message.includes("'previousValue'")
      );

      expect(timerIdIssue).toBeDefined();
      expect(previousValueIssue).toBeDefined();

      // Check confidence levels
      if (timerIdIssue?.confidence) {
        expect(['high', 'medium']).toContain(timerIdIssue.confidence);
      }
    });
  });

  describe('Redundant State Detection', () => {
    it('should NOT flag UI state that serves different purpose from data state', async () => {
      const result = await analyzer.analyze(fixturesDir, {
        pattern: '**/false-positives.tsx',
        ignore: [],
        format: 'json',
        fix: false,
        strict: false,
        verbose: false,
      });
      const redundantStateIssues = result.issues.filter((i) => i.rule === 'avoid-redundant-state');

      // selectedTransformerId should not be flagged as redundant
      const selectedTransformerIssue = redundantStateIssues.find((i) =>
        i.message.includes("'selectedTransformerId'")
      );
      expect(selectedTransformerIssue).toBeUndefined();
    });

    it('SHOULD flag truly redundant state', async () => {
      const result = await analyzer.analyze(fixturesDir, {
        pattern: '**/false-positives.tsx',
        ignore: [],
        format: 'json',
        fix: false,
        strict: false,
        verbose: false,
      });
      const redundantStateIssues = result.issues.filter((i) => i.rule === 'avoid-redundant-state');

      // itemCount should be flagged as redundant
      const itemCountIssue = redundantStateIssues.find((i) => i.message.includes("'itemCount'"));
      expect(itemCountIssue).toBeDefined();

      // Check confidence level
      if (itemCountIssue?.confidence) {
        expect(['high', 'medium']).toContain(itemCountIssue.confidence);
      }
    });
  });

  describe('Prop Drilling Detection', () => {
    it('should NOT flag legitimate UI props passed through 2 levels', async () => {
      const result = await analyzer.analyze(fixturesDir, {
        pattern: '**/false-positives.tsx',
        ignore: [],
        format: 'json',
        fix: false,
        strict: false,
        verbose: false,
      });
      const propDrillingIssues = result.issues.filter((i) => i.rule === 'detect-prop-drilling');

      // disabled prop should not be flagged (only 2 levels, UI concern)
      const disabledIssue = propDrillingIssues.find((i) => i.message.includes('"disabled"'));
      expect(disabledIssue).toBeUndefined();
    });

    it('SHOULD flag data props drilled through multiple components', async () => {
      const result = await analyzer.analyze(fixturesDir, {
        pattern: '**/false-positives.tsx',
        ignore: [],
        format: 'json',
        fix: false,
        strict: false,
        verbose: false,
      });
      const propDrillingIssues = result.issues.filter((i) => i.rule === 'detect-prop-drilling');

      // userData should be flagged
      const userDataIssue = propDrillingIssues.find((i) => i.message.includes('"userData"'));
      expect(userDataIssue).toBeDefined();

      // Should have high confidence for data prop drilling
      if (userDataIssue?.confidence) {
        expect(userDataIssue.confidence).toBe('high');
      }
    });
  });

  describe('Confidence Scoring', () => {
    it('should include confidence scores in issues', async () => {
      const result = await analyzer.analyze(fixturesDir, {
        pattern: '**/false-positives.tsx',
        ignore: [],
        format: 'json',
        fix: false,
        strict: false,
        verbose: false,
      });

      // Check that new issues have confidence scores
      const issuesWithConfidence = result.issues.filter((i) => i.confidence !== undefined);

      // At least some issues should have confidence scores
      expect(issuesWithConfidence.length).toBeGreaterThan(0);

      // Validate confidence values
      issuesWithConfidence.forEach((issue) => {
        expect(['high', 'medium', 'low']).toContain(issue.confidence);
      });
    });
  });
});
