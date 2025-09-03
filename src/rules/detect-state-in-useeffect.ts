import traverse from '@babel/traverse';
import { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { Rule, Issue, ProjectContext } from '../types.js';
import { isReactComponent, getNodeLocation, findUseEffectCalls } from '../utils/ast-helpers.js';

/**
 * Detects setState calls in useEffect that indicate derived state
 * which should be computed during render instead
 */
export const detectStateInUseEffectRule: Rule = {
  name: 'detect-state-in-useeffect',
  description: 'Derived state should be computed during render, not stored via useEffect',
  severity: 'warning',

  check(ast: t.File, filename: string, _context?: ProjectContext): Issue[] {
    const issues: Issue[] = [];

    const traverseFn = typeof traverse === 'function' ? traverse : (traverse as any).default;
    traverseFn(ast, {
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
  const useEffectCalls = findUseEffectCalls(path);

  for (const effectCall of useEffectCalls) {
    const setStateCalls = findSetStateCallsInEffect(effectCall);

    for (const setStateCall of setStateCalls) {
      if (isLikelyDerivedState(setStateCall, effectCall)) {
        const location = getNodeLocation(setStateCall.node);

        issues.push({
          rule: 'detect-state-in-useeffect',
          severity: 'warning',
          message: `State '${setStateCall.stateName}' appears to be derived from other state/props and should be computed during render`,
          file: filename,
          line: location.line,
          column: location.column,
          suggestion: `Remove this useState and compute the value during render. If expensive, consider useMemo.`,
          fixable: true,
        });
      }
    }
  }
}

type UseEffectCall = ReturnType<typeof findUseEffectCalls>[0];

interface SetStateCall {
  node: t.CallExpression;
  path: NodePath<t.CallExpression>;
  stateName: string;
  argumentNode: t.Node | null;
}

function findSetStateCallsInEffect(effectCall: UseEffectCall): SetStateCall[] {
  const setStateCalls: SetStateCall[] = [];

  if (!effectCall.callback) return setStateCalls;

  // Find all setState calls within the effect callback
  const callbackPath = effectCall.path.get('arguments.0') as NodePath;
  if (!callbackPath) return setStateCalls;

  callbackPath.traverse({
    CallExpression(path) {
      const { node } = path;

      // Check if it's a setter function (starts with 'set' and capital letter)
      if (t.isIdentifier(node.callee)) {
        const name = node.callee.name;
        if (name.startsWith('set') && name.length > 3 && /^set[A-Z]/.test(name)) {
          // Extract the state name from setter name
          const stateName = name.slice(3);
          const camelCaseName = stateName.charAt(0).toLowerCase() + stateName.slice(1);

          setStateCalls.push({
            node,
            path,
            stateName: camelCaseName,
            argumentNode: node.arguments[0] || null,
          });
        }
      }
    },
  });

  return setStateCalls;
}

function isLikelyDerivedState(setStateCall: SetStateCall, _effectCall: UseEffectCall): boolean {
  if (!setStateCall.argumentNode) return false;

  const arg = setStateCall.argumentNode;
  const stateName = setStateCall.stateName.toLowerCase();

  // Check for common derived state naming patterns
  const derivedPatterns = [
    'filtered',
    'sorted',
    'formatted',
    'total',
    'sum',
    'count',
    'percentage',
    'percent',
    'ratio',
    'average',
    'mean',
    'display',
    'label',
    'text',
    'visible',
    'hidden',
    'enabled',
    'disabled',
    'valid',
    'invalid',
    'all',
    'none',
    'some',
    'every',
    'has',
    'is',
  ];

  const hasDerivatedPattern = derivedPatterns.some((pattern) => stateName.includes(pattern));

  // Check if the argument contains array methods or computations
  const hasComputationPattern = containsComputation(arg);

  // Check for external/async operations (legitimate uses)
  const hasExternalOperation = containsExternalOperation(setStateCall.path);

  // If it has external operations, it's likely legitimate
  if (hasExternalOperation) return false;

  // If it has derived naming patterns OR contains computations, flag it
  return hasDerivatedPattern || hasComputationPattern;
}

function containsComputation(node: t.Node): boolean {
  let hasComputation = false;

  // Simple traversal to check for computation patterns
  const checkNode = (n: t.Node): void => {
    if (t.isCallExpression(n)) {
      // Check for array methods
      if (t.isMemberExpression(n.callee) && t.isIdentifier(n.callee.property)) {
        const methodName = n.callee.property.name;
        const computationMethods = [
          'filter',
          'map',
          'reduce',
          'sort',
          'find',
          'findIndex',
          'some',
          'every',
          'includes',
          'slice',
          'concat',
        ];
        if (computationMethods.includes(methodName)) {
          hasComputation = true;
        }
      }
      // Check for string methods
      if (t.isMemberExpression(n.callee) && t.isIdentifier(n.callee.property)) {
        const methodName = n.callee.property.name;
        const stringMethods = [
          'toLocaleDateString',
          'toLocaleString',
          'toFixed',
          'toLowerCase',
          'toUpperCase',
          'trim',
          'split',
          'join',
        ];
        if (stringMethods.includes(methodName)) {
          hasComputation = true;
        }
      }
    }

    // Check for binary expressions (math operations)
    if (t.isBinaryExpression(n)) {
      const mathOperators = ['+', '-', '*', '/', '%', '**'];
      if (mathOperators.includes(n.operator)) {
        hasComputation = true;
      }
    }

    // Check for conditional expressions (ternary)
    if (t.isConditionalExpression(n)) {
      hasComputation = true;
    }

    // Check for logical expressions that compute booleans
    if (t.isLogicalExpression(n)) {
      hasComputation = true;
    }

    // Recursively check child nodes
    for (const key in n) {
      const value = (n as any)[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item && typeof item === 'object' && item.type) {
              checkNode(item);
            }
          });
        } else if (value.type) {
          checkNode(value);
        }
      }
    }
  };

  checkNode(node);
  return hasComputation;
}

function containsExternalOperation(path: NodePath): boolean {
  // Check the parent useEffect for external operations
  const effectBody = path.getFunctionParent();
  if (!effectBody) return false;

  let hasExternal = false;

  effectBody.traverse({
    CallExpression(callPath) {
      const { node } = callPath;

      // Check for fetch or async operations
      if (t.isIdentifier(node.callee)) {
        const externalAPIs = ['fetch', 'setTimeout', 'setInterval', 'addEventListener'];
        if (externalAPIs.includes(node.callee.name)) {
          hasExternal = true;
        }
      }

      // Check for localStorage/sessionStorage
      if (t.isMemberExpression(node.callee)) {
        const obj = node.callee.object;
        if (t.isIdentifier(obj)) {
          const browserAPIs = ['localStorage', 'sessionStorage', 'navigator', 'window', 'document'];
          if (browserAPIs.includes(obj.name)) {
            hasExternal = true;
          }
        }
      }

      // Check for promise methods
      if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property)) {
        const promiseMethods = ['then', 'catch', 'finally'];
        if (promiseMethods.includes(node.callee.property.name)) {
          hasExternal = true;
        }
      }
    },

    AwaitExpression() {
      hasExternal = true;
    },

    // Check if useEffect has a cleanup function (often indicates subscriptions)
    ReturnStatement(returnPath) {
      if (returnPath.getFunctionParent() === effectBody) {
        hasExternal = true;
      }
    },
  });

  return hasExternal;
}
