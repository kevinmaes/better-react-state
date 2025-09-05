import { getTraverse, type NodePath } from '../utils/traverse-helper.js';
import * as t from '@babel/types';
import type { Rule, Issue, ProjectContext } from '../types.js';
import { isReactComponent, getNodeLocation, findUseStateCalls } from '../utils/ast-helpers.js';

/**
 * Detects useState that should be useRef for performance optimization
 * Identifies state that doesn't affect render output
 */
export const stateVsRefsRule: Rule = {
  name: 'state-vs-refs',
  description: "State that doesn't affect render output should use useRef instead of useState",
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
  const useStateCalls = findUseStateCalls(path);

  for (const stateCall of useStateCalls) {
    if (shouldUseRef(stateCall, path)) {
      const location = getNodeLocation(stateCall.node);
      const performanceImpact = getPerformanceImpact(stateCall.name, path);

      issues.push({
        rule: 'state-vs-refs',
        severity: 'warning',
        message: `State '${stateCall.name}' doesn't affect render output and should use useRef instead of useState`,
        file: filename,
        line: location.line,
        column: location.column,
        suggestion: `Use useRef instead of useState for '${stateCall.name}' to prevent unnecessary re-renders. ${performanceImpact}`,
        fixable: true,
      });
    }
  }
}

function shouldUseRef(
  stateCall: { name: string; setterName: string },
  componentPath: NodePath
): boolean {
  const { name: stateName } = stateCall;

  // Check if state is used in JSX (render output)
  if (isUsedInRender(stateName, componentPath)) {
    return false;
  }

  // Check if state has naming patterns suggesting non-render usage
  if (hasNonRenderNamingPattern(stateName)) {
    return true;
  }

  // Check if state is only used in effects or event handlers
  const usageContext = getStateUsageContext(stateName, componentPath);

  // If only used in non-render contexts, suggest useRef
  return usageContext.onlyInNonRenderContexts && usageContext.usageCount > 0;
}

function isUsedInRender(stateName: string, componentPath: NodePath): boolean {
  let usedInRender = false;

  // Find the return statement(s) of the component
  componentPath.traverse({
    ReturnStatement(path) {
      // Only check return statements that are direct children of the component
      if (path.getFunctionParent() === componentPath) {
        // Check if the state variable is referenced in the return value
        path.traverse({
          Identifier(identifierPath) {
            if (identifierPath.node.name === stateName) {
              // Make sure it's not a declaration, but a reference
              if (!identifierPath.isBindingIdentifier()) {
                usedInRender = true;
              }
            }
          },
        });
      }
    },
  });

  return usedInRender;
}

function hasNonRenderNamingPattern(stateName: string): boolean {
  const lowerName = stateName.toLowerCase();

  // Common patterns for non-render state
  const nonRenderPatterns = [
    // Timer/Interval patterns
    'timerid',
    'timer',
    'intervalid',
    'interval',
    'timeout',
    'timeoutid',
    // Reference patterns
    'ref',
    'element',
    'node',
    'dom',
    // Previous value patterns
    'prev',
    'previous',
    'last',
    'old',
    // Tracking patterns (when not displayed)
    'count',
    'counter',
    'clicks',
    'index',
    'position',
    // Flag patterns for internal logic
    'mounted',
    'initialized',
    'setup',
    'ready',
    // Time-related patterns
    'time',
    'mounttime',
    'rendercount',
  ];

  return nonRenderPatterns.some(
    (pattern) =>
      lowerName.includes(pattern) || lowerName.endsWith(pattern) || lowerName.startsWith(pattern)
  );
}

interface StateUsageContext {
  usageCount: number;
  onlyInNonRenderContexts: boolean;
  contexts: string[];
}

function getStateUsageContext(stateName: string, componentPath: NodePath): StateUsageContext {
  const contexts: string[] = [];
  let usageCount = 0;
  let hasRenderUsage = false;

  componentPath.traverse({
    Identifier(path) {
      if (path.node.name === stateName && !path.isBindingIdentifier()) {
        usageCount++;

        // Determine the context of usage
        const context = getIdentifierContext(path, componentPath);
        contexts.push(context);

        if (context === 'render') {
          hasRenderUsage = true;
        }
      }
    },
  });

  return {
    usageCount,
    onlyInNonRenderContexts: !hasRenderUsage,
    contexts: [...new Set(contexts)], // Remove duplicates
  };
}

function getIdentifierContext(identifierPath: NodePath, componentPath: NodePath): string {
  let currentPath: NodePath | null = identifierPath.parentPath;

  while (currentPath && currentPath !== componentPath) {
    // Check if we're in a useEffect
    if (
      currentPath.isCallExpression() &&
      currentPath.node.callee &&
      t.isIdentifier(currentPath.node.callee) &&
      currentPath.node.callee.name === 'useEffect'
    ) {
      return 'effect';
    }

    // Check if we're in an event handler (function that starts with 'handle' or 'on')
    if (currentPath.isFunctionExpression() || currentPath.isArrowFunctionExpression()) {
      const parent = currentPath.parent;
      if (t.isProperty(parent) && t.isIdentifier(parent.key)) {
        const handlerName = parent.key.name;
        if (handlerName.startsWith('handle') || handlerName.startsWith('on')) {
          return 'handler';
        }
      }
      if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
        const handlerName = parent.id.name;
        if (handlerName.startsWith('handle') || handlerName.startsWith('on')) {
          return 'handler';
        }
      }
    }

    // Check if we're in a return statement
    if (currentPath.isReturnStatement()) {
      const functionParent = currentPath.getFunctionParent();
      if (functionParent === componentPath) {
        return 'render';
      }
    }

    currentPath = currentPath.parentPath;
  }

  return 'other';
}

function getPerformanceImpact(stateName: string, componentPath: NodePath): string {
  const lowerName = stateName.toLowerCase();

  if (lowerName.includes('timer') || lowerName.includes('interval')) {
    return 'Timer updates cause unnecessary component re-renders on every tick.';
  }

  if (lowerName.includes('count') && !isUsedInRender(stateName, componentPath)) {
    return 'Counter updates trigger re-renders without displaying the value.';
  }

  if (lowerName.includes('prev') || lowerName.includes('previous')) {
    return "Previous value tracking for comparisons doesn't need to trigger re-renders.";
  }

  if (lowerName.includes('ref') || lowerName.includes('element')) {
    return 'DOM element references should use useRef to avoid re-renders on assignment.';
  }

  return 'This change prevents unnecessary re-renders and improves performance.';
}
