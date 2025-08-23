import traverse from '@babel/traverse';
const { default: traverseFn } = traverse as any;
import * as t from '@babel/types';
import type { Rule, Issue } from '../types.js';
import { isReactComponent, findUseStateCalls, getNodeLocation } from '../utils/ast-helpers.js';

/**
 * Detects multiple useState calls that update together and should use useReducer
 */
export const preferExplicitTransitionsRule: Rule = {
  name: 'prefer-explicit-transitions',
  description: 'Complex state logic with multiple updates should use useReducer',
  severity: 'info',
  
  check(ast: any, filename: string): Issue[] {
    const issues: Issue[] = [];
    
    (traverseFn || traverse)(ast, {
      FunctionDeclaration(path: any) {
        if (isReactComponent(path)) {
          checkComponent(path, filename, issues);
        }
      },
      FunctionExpression(path: any) {
        if (isReactComponent(path)) {
          checkComponent(path, filename, issues);
        }
      },
      ArrowFunctionExpression(path: any) {
        if (isReactComponent(path)) {
          checkComponent(path, filename, issues);
        }
      }
    });
    
    return issues;
  }
};

function checkComponent(path: any, filename: string, issues: Issue[]): void {
  const stateCalls = findUseStateCalls(path);
  
  // Skip if already using useReducer
  if (hasUseReducer(path)) {
    return;
  }
  
  // Check for multiple related state updates
  const stateUpdatePatterns = analyzeStateUpdates(path, stateCalls);
  
  // Detect complex state logic patterns
  if (shouldUseReducer(stateCalls, stateUpdatePatterns)) {
    const location = getNodeLocation(path.node);
    
    issues.push({
      rule: 'prefer-explicit-transitions',
      severity: 'info',
      message: `Component has ${stateCalls.length} state variables with complex update patterns that would benefit from useReducer`,
      file: filename,
      line: location.line,
      column: location.column,
      suggestion: `Consider using useReducer to make state transitions more explicit and predictable`,
      fixable: false // Complex refactoring
    });
  }
}

function hasUseReducer(path: any): boolean {
  let hasReducer = false;
  
  path.traverse({
    CallExpression(callPath: any) {
      if (
        t.isIdentifier(callPath.node.callee) &&
        callPath.node.callee.name === 'useReducer'
      ) {
        hasReducer = true;
      }
    }
  });
  
  return hasReducer;
}

interface StateUpdatePattern {
  setterName: string;
  updateLocations: any[];
  updatesWithOthers: string[];
  conditionalUpdates: number;
  dependsOnPrevState: boolean;
}

function analyzeStateUpdates(
  path: any,
  stateCalls: any[]
): Map<string, StateUpdatePattern> {
  const patterns = new Map<string, StateUpdatePattern>();
  
  // Initialize patterns for each state setter
  stateCalls.forEach(state => {
    patterns.set(state.setterName, {
      setterName: state.setterName,
      updateLocations: [],
      updatesWithOthers: [],
      conditionalUpdates: 0,
      dependsOnPrevState: false
    });
  });
  
  // Analyze each function/block for state updates
  path.traverse({
    CallExpression(callPath: any) {
      const { node } = callPath;
      
      // Check if it's a state setter call
      if (t.isIdentifier(node.callee)) {
        const pattern = patterns.get(node.callee.name);
        if (pattern) {
          pattern.updateLocations.push(callPath);
          
          // Check if it uses previous state
          if (node.arguments.length > 0 && t.isArrowFunctionExpression(node.arguments[0])) {
            pattern.dependsOnPrevState = true;
          }
          
          // Check if it's in a conditional
          if (isInConditional(callPath)) {
            pattern.conditionalUpdates++;
          }
          
          // Find other setters called in the same function/block
          const siblingSetters = findSiblingSetters(callPath, patterns);
          pattern.updatesWithOthers.push(...siblingSetters);
        }
      }
    }
  });
  
  return patterns;
}

function isInConditional(path: any): boolean {
  let current = path;
  while (current) {
    if (
      current.isIfStatement() ||
      current.isConditionalExpression() ||
      current.isSwitchStatement()
    ) {
      return true;
    }
    current = current.parentPath;
  }
  return false;
}

function findSiblingSetters(
  setterPath: any,
  patterns: Map<string, StateUpdatePattern>
): string[] {
  const siblings: string[] = [];
  const functionParent = setterPath.getFunctionParent();
  
  if (!functionParent) return siblings;
  
  // Look for other setter calls in the same function
  functionParent.traverse({
    CallExpression(siblingPath: any) {
      if (siblingPath === setterPath) return;
      
      const { node } = siblingPath;
      if (t.isIdentifier(node.callee) && patterns.has(node.callee.name)) {
        // Check if they're in the same block/scope
        if (areInSameScope(setterPath, siblingPath)) {
          siblings.push(node.callee.name);
        }
      }
    }
  });
  
  return [...new Set(siblings)]; // Remove duplicates
}

function areInSameScope(path1: any, path2: any): boolean {
  // Find the nearest block statement for both paths
  const block1 = path1.findParent((p: any) => p.isBlockStatement());
  const block2 = path2.findParent((p: any) => p.isBlockStatement());
  
  return block1 === block2;
}

function shouldUseReducer(
  stateCalls: any[],
  patterns: Map<string, StateUpdatePattern>
): boolean {
  // Criteria for suggesting useReducer:
  
  // 1. Many state variables (4+)
  if (stateCalls.length >= 4) {
    return true;
  }
  
  // 2. Complex update patterns
  let complexUpdates = 0;
  let relatedUpdates = 0;
  let conditionalComplexity = 0;
  
  patterns.forEach(pattern => {
    // Multiple states updated together
    if (pattern.updatesWithOthers.length >= 2) {
      relatedUpdates++;
    }
    
    // Complex conditional logic
    if (pattern.conditionalUpdates >= 2) {
      conditionalComplexity++;
    }
    
    // Depends on previous state
    if (pattern.dependsOnPrevState && pattern.updatesWithOthers.length > 0) {
      complexUpdates++;
    }
  });
  
  // 3. Multiple related updates
  if (relatedUpdates >= 2) {
    return true;
  }
  
  // 4. Complex conditional state logic
  if (conditionalComplexity >= 2 && stateCalls.length >= 3) {
    return true;
  }
  
  // 5. Complex updates with dependencies
  if (complexUpdates >= 2) {
    return true;
  }
  
  return false;
}