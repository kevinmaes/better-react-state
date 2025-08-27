import traverse from '@babel/traverse';
import { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { Rule, Issue, ProjectContext } from '../types.js';
import { isReactComponent, findUseStateCalls, getNodeLocation } from '../utils/ast-helpers.js';

/**
 * Detects deeply nested state objects that are difficult to update immutably
 */
export const avoidDeeplyNestedStateRule: Rule = {
  name: 'avoid-deeply-nested-state',
  description: 'Deeply nested state objects are difficult to update and prone to bugs',
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
  const stateCalls = findUseStateCalls(path);

  for (const stateCall of stateCalls) {
    const depth = getObjectDepth(stateCall.initialValue);
    const isNormalized = isNormalizedStructure(stateCall.initialValue);

    // Allow normalized structures (entities pattern) even if 3 levels deep
    if (depth > 2 && !isNormalized) {
      const location = getNodeLocation(stateCall.node);

      issues.push({
        rule: 'avoid-deeply-nested-state',
        severity: 'warning',
        message: `State '${stateCall.name}' is nested ${depth} levels deep, which makes updates complex`,
        file: filename,
        line: location.line,
        column: location.column,
        suggestion: `Consider flattening the state structure or normalizing the data`,
        fixable: false, // Complex refactoring, not easily auto-fixable
      });
    } else if (depth > 3) {
      // Even normalized structures shouldn't be more than 3 levels deep
      const location = getNodeLocation(stateCall.node);

      issues.push({
        rule: 'avoid-deeply-nested-state',
        severity: 'warning',
        message: `State '${stateCall.name}' is nested ${depth} levels deep, which makes updates complex`,
        file: filename,
        line: location.line,
        column: location.column,
        suggestion: `Consider flattening the state structure or normalizing the data`,
        fixable: false,
      });
    }
  }
}

function getObjectDepth(node: t.Node | null | undefined, currentDepth: number = 0): number {
  if (!node) return currentDepth;

  // Handle object expressions
  if (t.isObjectExpression(node)) {
    let maxDepth = currentDepth + 1;

    for (const property of node.properties) {
      if (t.isObjectProperty(property)) {
        const propertyDepth = getObjectDepth(property.value, currentDepth + 1);
        maxDepth = Math.max(maxDepth, propertyDepth);
      } else if (t.isObjectMethod(property)) {
        // Object methods don't have a value to check depth
        // We'll count them as current depth + 1
        maxDepth = Math.max(maxDepth, currentDepth + 1);
      }
    }

    return maxDepth;
  }

  // Handle array expressions that might contain objects
  if (t.isArrayExpression(node)) {
    let maxDepth = currentDepth;

    for (const element of node.elements) {
      if (element) {
        const elementDepth = getObjectDepth(element, currentDepth);
        maxDepth = Math.max(maxDepth, elementDepth);
      }
    }

    return maxDepth;
  }

  // Handle identifiers that might reference objects
  // In a real implementation, we'd need to track variable references

  return currentDepth;
}

function isNormalizedStructure(node: t.Node | null | undefined): boolean {
  if (!node || !t.isObjectExpression(node)) return false;

  // Check if it looks like a normalized entities structure
  // Common patterns: { users: { id: {...} }, posts: { id: {...} } }
  const properties = node.properties;

  for (const prop of properties) {
    if (t.isObjectProperty(prop) && t.isObjectExpression(prop.value)) {
      // Check if the nested object has ID-like keys
      const nestedProps = prop.value.properties;
      let hasIdKeys = true;

      for (const nestedProp of nestedProps) {
        if (t.isObjectProperty(nestedProp)) {
          // Check if key looks like an ID (number, numeric literal, or short string)
          let keyName = '';
          if (t.isIdentifier(nestedProp.key)) {
            keyName = nestedProp.key.name;
          } else if (t.isNumericLiteral(nestedProp.key)) {
            keyName = String(nestedProp.key.value);
          } else if (t.isStringLiteral(nestedProp.key)) {
            keyName = nestedProp.key.value;
          }

          if (!keyName || !/^\d+$|^[a-zA-Z0-9]{1,10}$/.test(keyName)) {
            hasIdKeys = false;
            break;
          }
        }
      }

      if (hasIdKeys) return true;
    }
  }

  return false;
}
