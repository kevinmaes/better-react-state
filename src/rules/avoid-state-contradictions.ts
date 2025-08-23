import traverse from '@babel/traverse';
const { default: traverseFn } = traverse as any;
import * as t from '@babel/types';
import type { Rule, Issue } from '../types.js';
import { isReactComponent, findUseStateCalls, getNodeLocation } from '../utils/ast-helpers.js';

/**
 * Detects multiple boolean states that can create contradictory UI states
 */
export const avoidStateContradictionsRule: Rule = {
  name: 'avoid-state-contradictions',
  description: 'Multiple boolean states can create impossible UI states',
  severity: 'error',
  
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
  
  // Look for boolean states that could contradict
  const booleanStates = stateCalls.filter(state => {
    return isBooleanState(state);
  });
  
  const contradictoryGroups = findContradictoryGroups(booleanStates);
  
  for (const group of contradictoryGroups) {
    const firstState = group[0];
    const location = getNodeLocation(firstState.node);
    
    const stateNames = group.map(s => s.name).join(', ');
    const enumValues = generateEnumValues(group);
    
    issues.push({
      rule: 'avoid-state-contradictions',
      severity: 'error',
      message: `Found ${group.length} boolean states that can contradict: ${stateNames}`,
      file: filename,
      line: location.line,
      column: location.column,
      suggestion: `Replace with a single state: const [status, setStatus] = useState<'${enumValues.join("' | '")}'>('${enumValues[0]}')`,
      fixable: true
    });
  }
}

function isBooleanState(state: any): boolean {
  const name = state.name.toLowerCase();
  
  // Check if name suggests boolean
  const booleanPrefixes = ['is', 'has', 'should', 'can', 'will', 'did', 'does'];
  const hasBooleanPrefix = booleanPrefixes.some(prefix => name.startsWith(prefix));
  
  // Check if initial value is boolean
  const hasBooleanInitialValue = t.isBooleanLiteral(state.initialValue);
  
  return hasBooleanPrefix || hasBooleanInitialValue;
}

function findContradictoryGroups(booleanStates: any[]): any[][] {
  const groups: any[][] = [];
  const processed = new Set<any>();
  
  for (let i = 0; i < booleanStates.length; i++) {
    if (processed.has(booleanStates[i])) continue;
    
    const group = [booleanStates[i]];
    processed.add(booleanStates[i]);
    
    for (let j = i + 1; j < booleanStates.length; j++) {
      if (processed.has(booleanStates[j])) continue;
      
      if (canContradict(booleanStates[i], booleanStates[j])) {
        group.push(booleanStates[j]);
        processed.add(booleanStates[j]);
      }
    }
    
    // Only consider it a group if there are 2+ states that can contradict
    if (group.length >= 2) {
      groups.push(group);
    }
  }
  
  return groups;
}

function canContradict(state1: any, state2: any): boolean {
  const name1 = state1.name.toLowerCase();
  const name2 = state2.name.toLowerCase();
  
  // Common contradictory patterns
  const patterns = [
    // Loading states
    ['loading', 'error', 'success', 'idle'],
    ['fetching', 'error', 'success'],
    ['pending', 'resolved', 'rejected'],
    // Visibility states
    ['open', 'closed', 'closing', 'opening'],
    ['visible', 'hidden', 'hiding', 'showing'],
    ['expanded', 'collapsed', 'expanding', 'collapsing'],
    // Form states
    ['pristine', 'dirty', 'submitting', 'submitted'],
    ['valid', 'invalid', 'validating'],
    // Connection states
    ['connected', 'disconnected', 'connecting'],
    ['online', 'offline', 'reconnecting'],
  ];
  
  // Check if both states belong to the same pattern group
  for (const pattern of patterns) {
    const matches1 = pattern.some(p => name1.includes(p));
    const matches2 = pattern.some(p => name2.includes(p));
    
    if (matches1 && matches2) {
      return true;
    }
  }
  
  // Check for common base with different states
  const stateWords = ['loading', 'error', 'success', 'pending', 'complete'];
  for (const word1 of stateWords) {
    for (const word2 of stateWords) {
      if (word1 !== word2 && name1.includes(word1) && name2.includes(word2)) {
        // Check if they have the same prefix/suffix
        const base1 = name1.replace(word1, '');
        const base2 = name2.replace(word2, '');
        if (base1 === base2) {
          return true;
        }
      }
    }
  }
  
  return false;
}

function generateEnumValues(group: any[]): string[] {
  const names = group.map(s => s.name.toLowerCase());
  
  // Try to extract meaningful enum values
  const values: string[] = [];
  
  for (const name of names) {
    // Remove common prefixes
    let value = name
      .replace(/^(is|has|should|can|will|did|does)/, '')
      .replace(/^_+/, '');
    
    // Convert to lowercase if not already
    value = value.toLowerCase();
    
    if (value && !values.includes(value)) {
      values.push(value);
    }
  }
  
  // Add 'idle' if not present and we have loading-like states
  if (values.some(v => ['loading', 'fetching', 'pending'].includes(v)) && !values.includes('idle')) {
    values.unshift('idle');
  }
  
  return values.length > 0 ? values : ['idle', 'loading', 'success', 'error'];
}