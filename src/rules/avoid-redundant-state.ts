import { getTraverse, type NodePath } from '../utils/traverse-helper.js';
import * as t from '@babel/types';
import type { Rule, Issue, ProjectContext } from '../types.js';
import { isReactComponent, findUseStateCalls, getNodeLocation } from '../utils/ast-helpers.js';

/**
 * Detects state that could be computed from other state
 */
export const avoidRedundantStateRule: Rule = {
  name: 'avoid-redundant-state',
  description: 'State that can be computed should not be stored separately',
  severity: 'warning',

  check(ast: t.File, filename: string, _context?: ProjectContext): Issue[] {
    const issues: Issue[] = [];

    const traverse = getTraverse();
    traverse(ast, {
      FunctionDeclaration(path: NodePath) {
        if (isReactComponent(path)) {
          checkComponent(path, filename, issues);
        }
      },
      FunctionExpression(path: NodePath) {
        if (isReactComponent(path)) {
          checkComponent(path, filename, issues);
        }
      },
      ArrowFunctionExpression(path: NodePath) {
        if (isReactComponent(path)) {
          checkComponent(path, filename, issues);
        }
      },
    });

    return issues;
  },
};

function checkComponent(path: NodePath, filename: string, issues: Issue[]): void {
  const stateCalls = findUseStateCalls(path);

  // Look for patterns that suggest computed state
  for (const state of stateCalls) {
    const analysis = analyzeRedundantState(state, stateCalls, path);
    if (analysis.isRedundant) {
      const location = getNodeLocation(state.node);

      issues.push({
        rule: 'avoid-redundant-state',
        severity: 'warning',
        message: `State '${state.name}' appears to be computable from other state`,
        file: filename,
        line: location.line,
        column: location.column,
        suggestion: `Consider computing this value during render instead of storing in state. ${analysis.reason}`,
        fixable: true,
        confidence: analysis.confidence,
      });
    }
  }

  // Check for state that's updated together with computed values
  checkForComputedUpdates(path, stateCalls, filename, issues);
}

type StatePurpose = 'ui' | 'data' | 'config' | 'computed' | 'tracking' | 'unknown';

interface RedundantStateAnalysis {
  isRedundant: boolean;
  confidence: 'high' | 'medium' | 'low';
  purpose: StatePurpose;
  reason: string;
}

function analyzeRedundantState(
  state: ReturnType<typeof findUseStateCalls>[0],
  allStates: ReturnType<typeof findUseStateCalls>,
  componentPath: NodePath
): RedundantStateAnalysis {
  const name = state.name.toLowerCase();
  const purpose = classifyStatePurpose(state, componentPath);
  let confidenceScore = 0;
  let isRedundant = false;
  let reason = '';

  // Common computed state patterns
  const computedPatterns = [
    'total',
    'sum',
    'count',
    'length',
    'size',
    'full',
    'empty',
    'valid',
    'invalid',
    'enabled',
    'disabled',
    'visible',
    'hidden',
    'selected',
    'checked',
    'active',
    'formatted',
    'display',
    'label',
    'percent',
    'progress',
    'ratio',
    'min',
    'max',
    'average',
    'mean',
  ];

  // Check if name suggests computed value
  const hasComputedPattern = computedPatterns.some((pattern) => name.includes(pattern));

  if (hasComputedPattern) {
    // Check if there are related states that this could be computed from
    const potentialSources = allStates.filter((s) => {
      if (s === state) return false;

      // Look for array states if this is a count/length
      if (['count', 'length', 'size', 'total'].some((p) => name.includes(p))) {
        return (
          t.isArrayExpression(s.initialValue) ||
          s.name.toLowerCase().includes('items') ||
          s.name.toLowerCase().includes('list') ||
          s.name.toLowerCase().includes('data')
        );
      }

      // Look for boolean sources for enabled/disabled, visible/hidden
      if (['enabled', 'disabled', 'visible', 'hidden'].some((p) => name.includes(p))) {
        return isBooleanState(s);
      }

      return false;
    });

    if (potentialSources.length > 0) {
      // Check if this state is updated independently from its potential sources
      const isIndependent = checkStateIndependence(state, potentialSources, componentPath);

      if (!isIndependent) {
        isRedundant = true;
        confidenceScore = 60;
        reason = `Can be derived from: ${potentialSources.map((s) => s.name).join(', ')}`;

        // Higher confidence for obvious patterns
        if (
          name.includes('count') &&
          potentialSources.some((s) => s.name.toLowerCase().includes('items'))
        ) {
          confidenceScore = 80;
        }
        if (
          name.includes('total') &&
          potentialSources.some((s) => s.name.toLowerCase().includes('price'))
        ) {
          confidenceScore = 75;
        }
      } else {
        // State seems to be managed independently, likely not redundant
        reason = 'State is managed independently from potential sources';
        confidenceScore = 20;
      }
    }
  }

  // Special case: UI state (selectedId vs data) is often NOT redundant
  if (purpose === 'ui' && name.includes('selected')) {
    // selectedTransformerId is different from activeTransformerIds
    const hasRelatedDataState = allStates.some(
      (s) =>
        s.name.toLowerCase().includes('active') ||
        s.name.toLowerCase().includes('data') ||
        s.name.toLowerCase().includes('items')
    );

    if (hasRelatedDataState) {
      // This is likely UI selection state, not redundant
      isRedundant = false;
      confidenceScore = 0;
      reason = 'UI selection state serves different purpose from data state';
    }
  }

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low';
  if (confidenceScore >= 70) {
    confidence = 'high';
  } else if (confidenceScore >= 40) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    isRedundant,
    confidence,
    purpose,
    reason,
  };
}

function classifyStatePurpose(
  state: ReturnType<typeof findUseStateCalls>[0],
  _componentPath: NodePath
): StatePurpose {
  const name = state.name.toLowerCase();

  // UI state patterns
  const uiPatterns = [
    'selected',
    'hovered',
    'focused',
    'expanded',
    'collapsed',
    'modal',
    'drawer',
    'tab',
    'step',
  ];
  if (uiPatterns.some((p) => name.includes(p))) {
    return 'ui';
  }

  // Data state patterns
  const dataPatterns = ['data', 'items', 'list', 'records', 'entities', 'results', 'response'];
  if (dataPatterns.some((p) => name.includes(p))) {
    return 'data';
  }

  // Config state patterns
  const configPatterns = ['config', 'settings', 'options', 'preferences', 'theme', 'mode'];
  if (configPatterns.some((p) => name.includes(p))) {
    return 'config';
  }

  // Computed patterns
  const computedPatterns = ['total', 'sum', 'count', 'length', 'formatted', 'display'];
  if (computedPatterns.some((p) => name.includes(p))) {
    return 'computed';
  }

  // Tracking patterns
  const trackingPatterns = ['loading', 'error', 'status', 'progress', 'pending'];
  if (trackingPatterns.some((p) => name.includes(p))) {
    return 'tracking';
  }

  return 'unknown';
}

function checkStateIndependence(
  state: ReturnType<typeof findUseStateCalls>[0],
  potentialSources: ReturnType<typeof findUseStateCalls>,
  componentPath: NodePath
): boolean {
  // Check if the state setter is called independently from potential source setters
  let independentUpdates = 0;
  let coupledUpdates = 0;

  const sourceSetters = potentialSources.map((s) => s.setterName);

  componentPath.traverse({
    CallExpression(path) {
      const { node } = path;

      if (t.isIdentifier(node.callee) && node.callee.name === state.setterName) {
        // Check if any source setters are called in the same function
        const functionParent = path.getFunctionParent();
        if (!functionParent) return;

        let hasSourceSetterCall = false;
        functionParent.traverse({
          CallExpression(innerPath) {
            if (innerPath === path) return;
            const innerNode = innerPath.node;
            if (t.isIdentifier(innerNode.callee) && sourceSetters.includes(innerNode.callee.name)) {
              hasSourceSetterCall = true;
            }
          },
        });

        if (hasSourceSetterCall) {
          coupledUpdates++;
        } else {
          independentUpdates++;
        }
      }
    },
  });

  // If state is mostly updated independently, it's likely not redundant
  return independentUpdates > coupledUpdates;
}

function _isLikelyComputedState(
  state: ReturnType<typeof findUseStateCalls>[0],
  allStates: ReturnType<typeof findUseStateCalls>
): boolean {
  const analysis = analyzeRedundantState(state, allStates, {} as NodePath);
  return analysis.isRedundant;
}

function checkForComputedUpdates(
  path: NodePath,
  stateCalls: ReturnType<typeof findUseStateCalls>,
  filename: string,
  issues: Issue[]
): void {
  // Look for patterns where multiple setState calls happen together
  const setterNames = stateCalls.map((s) => s.setterName);

  path.traverse({
    CallExpression(callPath: NodePath<t.CallExpression>) {
      const { node } = callPath;

      // Check if it's a setter call
      if (t.isIdentifier(node.callee) && setterNames.includes(node.callee.name)) {
        // Look for sibling setter calls in the same block/function
        const parent = callPath.getFunctionParent();
        if (!parent) return;

        const siblingSetters: string[] = [];

        parent.traverse({
          CallExpression(siblingPath: NodePath<t.CallExpression>) {
            if (siblingPath === callPath) return;

            const siblingNode = siblingPath.node;
            if (
              t.isIdentifier(siblingNode.callee) &&
              setterNames.includes(siblingNode.callee.name)
            ) {
              siblingSetters.push(siblingNode.callee.name);
            }
          },
        });

        // If multiple setters are called together, check if some might be computed
        if (siblingSetters.length > 0) {
          analyzeRelatedSetters(node.callee.name, siblingSetters, stateCalls, filename, issues);
        }
      }
    },
  });
}

function analyzeRelatedSetters(
  _mainSetter: string,
  _siblingSetters: string[],
  _stateCalls: ReturnType<typeof findUseStateCalls>,
  _filename: string,
  _issues: Issue[]
): void {
  // Common patterns of computed updates
  const _patterns = [
    {
      source: ['items', 'list', 'data'],
      computed: ['count', 'length', 'total', 'size', 'empty'],
    },
    {
      source: ['price', 'quantity', 'rate'],
      computed: ['total', 'sum', 'amount'],
    },
    {
      source: ['selected', 'checked'],
      computed: ['all', 'none', 'some'],
    },
  ];

  // This is a simplified check - in a real implementation,
  // we'd do more sophisticated data flow analysis
}

function isBooleanState(state: ReturnType<typeof findUseStateCalls>[0]): boolean {
  const name = state.name.toLowerCase();
  const booleanPrefixes = ['is', 'has', 'should', 'can', 'will', 'did', 'does'];
  return (
    booleanPrefixes.some((prefix) => name.startsWith(prefix)) ||
    t.isBooleanLiteral(state.initialValue)
  );
}
