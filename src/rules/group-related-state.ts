import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Rule, Issue } from '../types.js';
import { isReactComponent, findUseStateCalls, getNodeLocation } from '../utils/ast-helpers.js';

/**
 * Detects multiple useState calls that appear to be related and should be grouped
 * into a single state object.
 */
export const groupRelatedStateRule: Rule = {
  name: 'group-related-state',
  description: 'Multiple related state variables should be grouped into a single state object',
  severity: 'warning',
  
  check(ast: any, filename: string): Issue[] {
    const issues: Issue[] = [];
    
    traverse(ast, {
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
  
  // Look for patterns that suggest related state
  const relatedGroups = findRelatedStateGroups(stateCalls);
  
  for (const group of relatedGroups) {
    const firstState = group[0];
    const location = getNodeLocation(firstState.node);
    
    issues.push({
      rule: 'group-related-state',
      severity: 'warning',
      message: `Found ${group.length} related state variables that should be grouped: ${group.map(s => s.name).join(', ')}`,
      file: filename,
      line: location.line,
      column: location.column,
      suggestion: `Consider combining these into a single state object: const [${getGroupName(group)}, set${capitalize(getGroupName(group))}] = useState({ ${group.map(s => `${s.name}: ${getInitialValueString(s.initialValue)}`).join(', ')} })`,
      fixable: true
    });
  }
}

function findRelatedStateGroups(stateCalls: any[]): any[][] {
  const groups: any[][] = [];
  const processed = new Set<any>();
  
  for (let i = 0; i < stateCalls.length; i++) {
    if (processed.has(stateCalls[i])) continue;
    
    const group = [stateCalls[i]];
    processed.add(stateCalls[i]);
    
    for (let j = i + 1; j < stateCalls.length; j++) {
      if (processed.has(stateCalls[j])) continue;
      
      if (areRelated(stateCalls[i], stateCalls[j], stateCalls)) {
        group.push(stateCalls[j]);
        processed.add(stateCalls[j]);
      }
    }
    
    // Only consider it a group if there are 2+ related states
    if (group.length >= 2) {
      groups.push(group);
    }
  }
  
  return groups;
}

function areRelated(state1: any, state2: any, allStates: any[]): boolean {
  const name1 = state1.name.toLowerCase();
  const name2 = state2.name.toLowerCase();
  
  // Common patterns for related state
  const patterns = [
    // Form fields
    { prefixes: ['user', 'form', 'input'], suffixes: ['name', 'email', 'password', 'phone', 'address'] },
    // Loading states
    { prefixes: ['is', 'has'], suffixes: ['loading', 'error', 'success', 'fetching'] },
    // Data and metadata
    { prefixes: [''], suffixes: ['data', 'error', 'loading', 'status'] },
    // Coordinates/dimensions
    { prefixes: [''], suffixes: ['x', 'y', 'width', 'height', 'top', 'left', 'right', 'bottom'] },
    // Pagination
    { prefixes: ['page', 'current'], suffixes: ['number', 'size', 'total', 'count'] },
    // Selection
    { prefixes: ['selected', 'checked'], suffixes: ['items', 'ids', 'values'] }
  ];
  
  // Check if they share common prefixes or suffixes
  for (const pattern of patterns) {
    const matchesPattern1 = pattern.prefixes.some(p => name1.startsWith(p)) && 
                           pattern.suffixes.some(s => name1.endsWith(s));
    const matchesPattern2 = pattern.prefixes.some(p => name2.startsWith(p)) && 
                           pattern.suffixes.some(s => name2.endsWith(s));
    
    if (matchesPattern1 && matchesPattern2) {
      return true;
    }
  }
  
  // Check for common base names (e.g., productId, productName, productPrice)
  const base1 = extractBaseName(name1);
  const base2 = extractBaseName(name2);
  
  if (base1 && base2 && base1 === base2) {
    return true;
  }
  
  // Check if they're used together in the same expressions
  // This would require more complex analysis of the AST
  
  return false;
}

function extractBaseName(name: string): string | null {
  // Common patterns: userId, userName -> user
  const patterns = [
    /^(.+)(Id|Name|Email|Phone|Address|Date|Time|Count|Total|Size)$/i,
    /^(is|has)(.+)$/i,
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      return match[1].toLowerCase();
    }
  }
  
  return null;
}

function getGroupName(group: any[]): string {
  // Try to find a common base name
  const baseNames = group.map(s => extractBaseName(s.name)).filter(Boolean);
  if (baseNames.length > 0) {
    return baseNames[0]!;
  }
  
  // Fallback to a generic name
  return 'state';
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getInitialValueString(node: any): string {
  if (!node) return 'undefined';
  
  if (t.isStringLiteral(node)) return `'${node.value}'`;
  if (t.isNumericLiteral(node)) return String(node.value);
  if (t.isBooleanLiteral(node)) return String(node.value);
  if (t.isNullLiteral(node)) return 'null';
  if (t.isIdentifier(node) && node.name === 'undefined') return 'undefined';
  if (t.isArrayExpression(node)) return '[]';
  if (t.isObjectExpression(node)) return '{}';
  
  return 'initialValue';
}