import traverse from '@babel/traverse';
const { default: traverseFn } = traverse as any;
import * as t from '@babel/types';
import type { Rule, Issue, ProjectContext } from '../types.js';
import { isReactComponent, findUseStateCalls, getNodeLocation } from '../utils/ast-helpers.js';

/**
 * Detects multiple useState calls that update together and should use useReducer
 */
export const preferExplicitTransitionsRule: Rule = {
  name: 'prefer-explicit-transitions',
  description: 'Complex state logic with multiple updates should use useReducer',
  severity: 'info',
  
  check(ast: any, filename: string, context?: ProjectContext): Issue[] {
    const issues: Issue[] = [];
    
    (traverseFn || traverse)(ast, {
      FunctionDeclaration(path: any) {
        if (isReactComponent(path)) {
          checkComponent(path, filename, issues, context);
        }
      },
      FunctionExpression(path: any) {
        if (isReactComponent(path)) {
          checkComponent(path, filename, issues, context);
        }
      },
      ArrowFunctionExpression(path: any) {
        if (isReactComponent(path)) {
          checkComponent(path, filename, issues, context);
        }
      }
    });
    
    return issues;
  }
};

function checkComponent(path: any, filename: string, issues: Issue[], context?: ProjectContext): void {
  const stateCalls = findUseStateCalls(path);
  
  // Skip if already using useReducer
  if (hasUseReducer(path)) {
    return;
  }
  
  // Check for multiple related state updates
  const stateUpdatePatterns = analyzeStateUpdates(path, stateCalls);
  
  // Detect complex state logic patterns
  const complexity = getComplexityLevel(stateCalls, stateUpdatePatterns);
  
  if (complexity !== 'simple') {
    const location = getNodeLocation(path.node);
    const suggestion = getSuggestion(complexity, stateCalls.length, context);
    
    issues.push({
      rule: 'prefer-explicit-transitions',
      severity: 'info',
      message: `Component has ${stateCalls.length} state variables with complex update patterns`,
      file: filename,
      line: location.line,
      column: location.column,
      suggestion,
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

function getComplexityLevel(
  stateCalls: any[],
  patterns: Map<string, StateUpdatePattern>
): 'simple' | 'moderate' | 'complex' {
  const stateCount = stateCalls.length;
  
  // Count complexity indicators
  let complexUpdates = 0;
  let relatedUpdates = 0;
  let conditionalComplexity = 0;
  
  patterns.forEach(pattern => {
    if (pattern.updatesWithOthers.length >= 2) {
      relatedUpdates++;
    }
    
    if (pattern.conditionalUpdates >= 2) {
      conditionalComplexity++;
    }
    
    if (pattern.dependsOnPrevState && pattern.updatesWithOthers.length > 0) {
      complexUpdates++;
    }
  });
  
  // Determine complexity level
  if (stateCount >= 8 || complexUpdates >= 3 || 
      (conditionalComplexity >= 3 && stateCount >= 4)) {
    return 'complex';
  }
  
  if (stateCount >= 4 || relatedUpdates >= 2 || 
      (conditionalComplexity >= 2 && stateCount >= 3) || 
      complexUpdates >= 2) {
    return 'moderate';
  }
  
  return 'simple';
}

function getSuggestion(
  complexity: 'moderate' | 'complex',
  stateCount: number,
  context?: ProjectContext
): string {
  if (complexity === 'moderate') {
    if (context?.hasXStateStore) {
      return 'Consider using @xstate/store (already in your project) for atomic, event-driven state updates';
    } else if (context?.hasXState) {
      return 'Consider using useReducer or @xstate/store for better state organization';
    } else {
      return 'Consider using useReducer to make state transitions more explicit and predictable';
    }
  }
  
  // complexity === 'complex'
  if (context?.hasXState) {
    return 'Consider using XState (already in your project) for complex state orchestration and visual modeling';
  } else if (context?.hasXStateStore) {
    return 'Consider using @xstate/store (already in your project) or upgrading to full XState for complex state machines';
  } else {
    return 'Consider using useReducer or exploring XState for complex state orchestration';
  }
}