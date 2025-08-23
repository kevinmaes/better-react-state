import traverse from '@babel/traverse';
const { default: traverseFn } = traverse as any;
import * as t from '@babel/types';
import type { Rule, Issue } from '../types.js';
import { isReactComponent, findUseStateCalls, getNodeLocation } from '../utils/ast-helpers.js';

/**
 * Detects state that could be computed from other state
 */
export const avoidRedundantStateRule: Rule = {
  name: 'avoid-redundant-state',
  description: 'State that can be computed should not be stored separately',
  severity: 'warning',
  
  check(ast: any, filename: string): Issue[] {
    const issues: Issue[] = [];
    
    (traverseFn || traverse)(ast, {
      FunctionDeclaration(path) {
        if (isReactComponent(path)) {
          checkComponent(path, filename, issues);
        }
      },
      FunctionExpression(path) {
        if (isReactComponent(path)) {
          checkComponent(path, filename, issues);
        }
      },
      ArrowFunctionExpression(path) {
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
  
  // Look for patterns that suggest computed state
  for (const state of stateCalls) {
    if (isLikelyComputedState(state, stateCalls)) {
      const location = getNodeLocation(state.node);
      
      issues.push({
        rule: 'avoid-redundant-state',
        severity: 'warning',
        message: `State '${state.name}' appears to be computable from other state`,
        file: filename,
        line: location.line,
        column: location.column,
        suggestion: `Consider computing this value during render instead of storing in state`,
        fixable: true
      });
    }
  }
  
  // Check for state that's updated together with computed values
  checkForComputedUpdates(path, stateCalls, filename, issues);
}

function isLikelyComputedState(state: any, allStates: any[]): boolean {
  const name = state.name.toLowerCase();
  
  // Common computed state patterns
  const computedPatterns = [
    'total', 'sum', 'count', 'length', 'size',
    'full', 'empty', 'valid', 'invalid',
    'enabled', 'disabled', 'visible', 'hidden',
    'selected', 'checked', 'active',
    'formatted', 'display', 'label',
    'percent', 'progress', 'ratio',
    'min', 'max', 'average', 'mean'
  ];
  
  // Check if name suggests computed value
  const hasComputedPattern = computedPatterns.some(pattern => name.includes(pattern));
  
  if (hasComputedPattern) {
    // Check if there are related states that this could be computed from
    const potentialSources = allStates.filter(s => {
      if (s === state) return false;
      
      // Look for array states if this is a count/length
      if (['count', 'length', 'size', 'total'].some(p => name.includes(p))) {
        return t.isArrayExpression(s.initialValue) || name.includes('items') || name.includes('list');
      }
      
      // Look for boolean sources for enabled/disabled, visible/hidden
      if (['enabled', 'disabled', 'visible', 'hidden'].some(p => name.includes(p))) {
        return isBooleanState(s);
      }
      
      return true;
    });
    
    return potentialSources.length > 0;
  }
  
  return false;
}

function checkForComputedUpdates(path: any, stateCalls: any[], filename: string, issues: Issue[]): void {
  // Look for patterns where multiple setState calls happen together
  const setterNames = stateCalls.map(s => s.setterName);
  
  path.traverse({
    CallExpression(callPath) {
      const { node } = callPath;
      
      // Check if it's a setter call
      if (t.isIdentifier(node.callee) && setterNames.includes(node.callee.name)) {
        // Look for sibling setter calls in the same block/function
        const parent = callPath.getFunctionParent();
        if (!parent) return;
        
        const siblingSetters: any[] = [];
        
        parent.traverse({
          CallExpression(siblingPath) {
            if (siblingPath === callPath) return;
            
            const siblingNode = siblingPath.node;
            if (t.isIdentifier(siblingNode.callee) && setterNames.includes(siblingNode.callee.name)) {
              siblingSetters.push({
                name: siblingNode.callee.name,
                node: siblingNode,
                path: siblingPath
              });
            }
          }
        });
        
        // If multiple setters are called together, check if some might be computed
        if (siblingSetters.length > 0) {
          analyzeRelatedSetters(callPath, siblingSetters, stateCalls, filename, issues);
        }
      }
    }
  });
}

function analyzeRelatedSetters(
  mainSetter: any, 
  siblingSetters: any[], 
  stateCalls: any[], 
  filename: string, 
  issues: Issue[]
): void {
  // Common patterns of computed updates
  const patterns = [
    {
      source: ['items', 'list', 'data'],
      computed: ['count', 'length', 'total', 'size', 'empty']
    },
    {
      source: ['price', 'quantity', 'rate'],
      computed: ['total', 'sum', 'amount']
    },
    {
      source: ['selected', 'checked'],
      computed: ['all', 'none', 'some']
    }
  ];
  
  // This is a simplified check - in a real implementation, 
  // we'd do more sophisticated data flow analysis
}

function isBooleanState(state: any): boolean {
  const name = state.name.toLowerCase();
  const booleanPrefixes = ['is', 'has', 'should', 'can', 'will', 'did', 'does'];
  return booleanPrefixes.some(prefix => name.startsWith(prefix)) || 
         t.isBooleanLiteral(state.initialValue);
}