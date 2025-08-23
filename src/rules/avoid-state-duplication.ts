import traverse from '@babel/traverse';
const { default: traverseFn } = traverse as any;
import * as t from '@babel/types';
import type { Rule, Issue, ProjectContext } from '../types.js';
import { isReactComponent, findUseStateCalls, getNodeLocation } from '../utils/ast-helpers.js';

/**
 * Detects state that duplicates data from props or other state
 */
export const avoidStateDuplicationRule: Rule = {
  name: 'avoid-state-duplication',
  description: 'State should not duplicate data that exists elsewhere',
  severity: 'warning',
  
  check(ast: any, filename: string, context?: ProjectContext): Issue[] {
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
  const props = extractComponentProps(path);
  
  // Check for state initialized from props
  checkPropsInitialization(stateCalls, props, filename, issues);
  
  // Check for state that duplicates other state
  checkStateDuplication(stateCalls, path, filename, issues);
  
  // Check for storing entire objects when only using specific fields
  checkSelectiveUsage(stateCalls, path, filename, issues);
}

function extractComponentProps(path: any): string[] {
  const props: string[] = [];
  
  // Check function parameters for props
  const params = path.node.params;
  if (params.length > 0) {
    const firstParam = params[0];
    
    // Handle destructured props: function Component({ prop1, prop2 })
    if (t.isObjectPattern(firstParam)) {
      firstParam.properties.forEach((prop: any) => {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
          props.push(prop.key.name);
        }
      });
    }
    // Handle props object: function Component(props)
    else if (t.isIdentifier(firstParam)) {
      // Track props.* usage
      path.traverse({
        MemberExpression(memberPath: any) {
          if (
            t.isIdentifier(memberPath.node.object) &&
            memberPath.node.object.name === firstParam.name &&
            t.isIdentifier(memberPath.node.property)
          ) {
            props.push(memberPath.node.property.name);
          }
        }
      });
    }
  }
  
  return props;
}

function checkPropsInitialization(
  stateCalls: any[],
  props: string[],
  filename: string,
  issues: Issue[]
): void {
  for (const stateCall of stateCalls) {
    const initValue = stateCall.initialValue;
    
    // Check if initial value references props
    if (initValue && (t.isIdentifier(initValue) || t.isMemberExpression(initValue))) {
      const propName = extractPropReference(initValue);
      
      if (propName && props.includes(propName)) {
        const location = getNodeLocation(stateCall.node);
        
        issues.push({
          rule: 'avoid-state-duplication',
          severity: 'warning',
          message: `State '${stateCall.name}' is initialized from prop '${propName}', which can cause synchronization issues`,
          file: filename,
          line: location.line,
          column: location.column,
          suggestion: `Use the prop directly or derive state from props in an effect if needed`,
          fixable: false
        });
      }
    }
    
    // Also check if initialized from other state (member expressions like user.id)
    if (initValue && t.isMemberExpression(initValue)) {
      const objectName = t.isIdentifier(initValue.object) ? initValue.object.name : null;
      const otherState = stateCalls.find(s => s.name === objectName);
      
      if (otherState) {
        const location = getNodeLocation(stateCall.node);
        const property = t.isIdentifier(initValue.property) ? initValue.property.name : 'property';
        
        issues.push({
          rule: 'avoid-state-duplication',
          severity: 'warning',
          message: `State '${stateCall.name}' is initialized from '${objectName}.${property}', creating duplication`,
          file: filename,
          line: location.line,
          column: location.column,
          suggestion: `Consider using a single source of truth or computing derived values`,
          fixable: false
        });
      }
    }
  }
}

function checkStateDuplication(
  stateCalls: any[],
  path: any,
  filename: string,
  issues: Issue[]
): void {
  // Look for patterns where one state is set from another
  path.traverse({
    CallExpression(callPath: any) {
      const node = callPath.node;
      
      // Check if it's a state setter call
      const setterState = stateCalls.find(s => 
        t.isIdentifier(node.callee) && node.callee.name === s.setterName
      );
      
      if (setterState && node.arguments.length > 0) {
        const arg = node.arguments[0];
        
        // Check if the setter is called with another state value
        const sourceState = stateCalls.find(s => 
          t.isIdentifier(arg) && arg.name === s.name
        );
        
        if (sourceState && sourceState !== setterState) {
          const location = getNodeLocation(node);
          
          issues.push({
            rule: 'avoid-state-duplication',
            severity: 'warning',
            message: `State '${setterState.name}' is being set from state '${sourceState.name}', creating duplication`,
            file: filename,
            line: location.line,
            column: location.column,
            suggestion: `Consider using a single source of truth or computing derived values`,
            fixable: false
          });
        }
      }
    }
  });
}

function checkSelectiveUsage(
  stateCalls: any[],
  path: any,
  filename: string,
  issues: Issue[]
): void {
  // Track which properties of state objects are actually used
  const stateUsage = new Map<string, Set<string>>();
  
  path.traverse({
    MemberExpression(memberPath: any) {
      const { object, property } = memberPath.node;
      
      // Check if it's accessing a state variable's property
      if (t.isIdentifier(object) && t.isIdentifier(property)) {
        const state = stateCalls.find(s => s.name === object.name);
        
        if (state) {
          if (!stateUsage.has(state.name)) {
            stateUsage.set(state.name, new Set());
          }
          stateUsage.get(state.name)!.add(property.name);
        }
      }
    }
  });
  
  // Check if state stores entire objects but only uses specific fields
  for (const [stateName, usedProps] of stateUsage) {
    const state = stateCalls.find(s => s.name === stateName);
    
    if (state && isObjectInitializer(state.initialValue) && usedProps.size <= 2) {
      const totalProps = countObjectProperties(state.initialValue);
      
      if (totalProps > 3 && usedProps.size < totalProps / 2) {
        const location = getNodeLocation(state.node);
        
        issues.push({
          rule: 'avoid-state-duplication',
          severity: 'info',
          message: `State '${stateName}' stores ${totalProps} properties but only uses ${Array.from(usedProps).join(', ')}`,
          file: filename,
          line: location.line,
          column: location.column,
          suggestion: `Consider storing only the needed properties or using a ref for non-reactive data`,
          fixable: false
        });
      }
    }
  }
}

function extractPropReference(node: any): string | null {
  if (t.isIdentifier(node)) {
    return node.name;
  }
  if (t.isMemberExpression(node) && t.isIdentifier(node.object)) {
    if (node.object.name === 'props' && t.isIdentifier(node.property)) {
      return node.property.name;
    }
  }
  return null;
}

function isObjectInitializer(node: any): boolean {
  return t.isObjectExpression(node) || 
         (t.isIdentifier(node) && node.name.includes('initial'));
}

function countObjectProperties(node: any): number {
  if (t.isObjectExpression(node)) {
    return node.properties.length;
  }
  return 0;
}