import { getTraverse, type NodePath } from '../utils/traverse-helper.js';
import * as t from '@babel/types';
import type { Rule, Issue, ProjectContext } from '../types.js';
import {
  isReactComponent,
  getNodeLocation,
  findUseEffectCalls,
  findUseStateCalls,
} from '../utils/ast-helpers.js';

/**
 * Detects API/server data stored in useState instead of using
 * dedicated server state management libraries like React Query, SWR, or RTK Query
 */
export const serverVsClientStateRule: Rule = {
  name: 'server-vs-client-state',
  description: 'Server data should be managed with dedicated libraries, not useState',
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

interface ServerStatePattern {
  dataState: string;
  loadingState?: string;
  errorState?: string;
  fetchLocation: FetchLocation | null;
}

interface FetchLocation {
  node: t.Node;
  line: number;
  column: number;
  method: string;
}

function checkComponent(path: NodePath, filename: string, issues: Issue[]): void {
  const useStateCalls = findUseStateCalls(path);
  const useEffectCalls = findUseEffectCalls(path);

  // Find patterns that indicate server state management
  const serverStatePatterns = identifyServerStatePatterns(useStateCalls, useEffectCalls, path);

  for (const pattern of serverStatePatterns) {
    const location = pattern.fetchLocation || getNodeLocation(path.node);

    const stateNames = [pattern.dataState, pattern.loadingState, pattern.errorState]
      .filter(Boolean)
      .join(', ');

    issues.push({
      rule: 'server-vs-client-state',
      severity: 'warning',
      message: `Server data (${stateNames}) is managed with useState instead of a data fetching library`,
      file: filename,
      line: location.line,
      column: location.column,
      suggestion:
        'Consider using React Query, SWR, or RTK Query for server state management. These provide caching, deduplication, and automatic refetching.',
      fixable: false,
    });
  }
}

function identifyServerStatePatterns(
  useStateCalls: ReturnType<typeof findUseStateCalls>,
  useEffectCalls: ReturnType<typeof findUseEffectCalls>,
  componentPath: NodePath
): ServerStatePattern[] {
  const patterns: ServerStatePattern[] = [];

  // Pattern 1: Look for typical loading/error/data state triads
  const loadingStates = useStateCalls.filter((s) => {
    const name = s.name.toLowerCase();
    return (
      name.includes('loading') ||
      name.includes('fetching') ||
      name.includes('pending') ||
      name === 'isloading'
    );
  });

  const errorStates = useStateCalls.filter((s) => {
    const name = s.name.toLowerCase();
    return name.includes('error') || name === 'iserror';
  });

  const dataStates = useStateCalls.filter((s) => {
    const name = s.name.toLowerCase();
    return (
      name.includes('data') ||
      name.includes('result') ||
      name.includes('response') ||
      name.includes('items') ||
      name.includes('users') ||
      name.includes('posts') ||
      name.includes('products') ||
      name.includes('orders')
    );
  });

  // Check for fetch patterns in useEffects
  for (const effect of useEffectCalls) {
    const fetchInfo = findFetchCallsInEffect(effect);
    if (fetchInfo.length > 0) {
      // Find related state setters being called in the effect
      const settersInEffect = findSettersInEffect(effect);

      for (const fetchCall of fetchInfo) {
        // Try to match setters with state definitions
        const relatedDataState = findRelatedState(settersInEffect, dataStates);
        const relatedLoadingState = findRelatedState(settersInEffect, loadingStates);
        const relatedErrorState = findRelatedState(settersInEffect, errorStates);

        if (relatedDataState || (relatedLoadingState && relatedErrorState)) {
          patterns.push({
            dataState: relatedDataState?.name || 'data',
            loadingState: relatedLoadingState?.name,
            errorState: relatedErrorState?.name,
            fetchLocation: fetchCall,
          });
        }
      }
    }
  }

  // Pattern 2: Look for direct fetch calls in component body (not in useEffect)
  const fetchCallsInComponent = findFetchCallsInComponent(componentPath);
  for (const fetchCall of fetchCallsInComponent) {
    // Check if there are related state variables
    if (dataStates.length > 0 || (loadingStates.length > 0 && errorStates.length > 0)) {
      patterns.push({
        dataState: dataStates[0]?.name || 'data',
        loadingState: loadingStates[0]?.name,
        errorState: errorStates[0]?.name,
        fetchLocation: fetchCall,
      });
      break; // Only report once per component
    }
  }

  // Pattern 3: useState with initial fetch-like value
  for (const stateCall of useStateCalls) {
    if (isFetchRelatedInitialValue(stateCall)) {
      patterns.push({
        dataState: stateCall.name,
        loadingState: undefined,
        errorState: undefined,
        fetchLocation: null,
      });
    }
  }

  return patterns;
}

function findFetchCallsInEffect(effect: ReturnType<typeof findUseEffectCalls>[0]): FetchLocation[] {
  const fetchCalls: FetchLocation[] = [];

  if (!effect.callback) return fetchCalls;

  const callbackPath = effect.path.get('arguments.0') as NodePath;
  if (!callbackPath) return fetchCalls;

  callbackPath.traverse({
    CallExpression(path) {
      const { node } = path;

      // Check for fetch API
      if (t.isIdentifier(node.callee) && node.callee.name === 'fetch') {
        const location = getNodeLocation(node);
        fetchCalls.push({
          node,
          line: location.line,
          column: location.column,
          method: 'fetch',
        });
      }

      // Check for axios or other HTTP clients
      if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property)) {
        const methods = ['get', 'post', 'put', 'delete', 'patch', 'request', 'query'];
        const property = node.callee.property.name;

        if (methods.includes(property)) {
          // Check if object is axios or similar
          if (t.isIdentifier(node.callee.object)) {
            const objName = node.callee.object.name;
            if (['axios', 'http', 'api', 'client', '$http'].includes(objName)) {
              const location = getNodeLocation(node);
              fetchCalls.push({
                node,
                line: location.line,
                column: location.column,
                method: `${objName}.${property}`,
              });
            }
          }
        }
      }

      // Check for GraphQL queries
      if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property)) {
        const property = node.callee.property.name;
        if (['query', 'mutate', 'subscribe'].includes(property)) {
          if (t.isIdentifier(node.callee.object)) {
            const objName = node.callee.object.name;
            if (['client', 'apollo', 'graphql'].includes(objName.toLowerCase())) {
              const location = getNodeLocation(node);
              fetchCalls.push({
                node,
                line: location.line,
                column: location.column,
                method: `${objName}.${property}`,
              });
            }
          }
        }
      }
    },

    // Check for async/await patterns
    AwaitExpression(path) {
      const { node } = path;
      if (t.isCallExpression(node.argument)) {
        const call = node.argument;

        // Check if it's fetch or axios
        if (t.isIdentifier(call.callee) && call.callee.name === 'fetch') {
          const location = getNodeLocation(node);
          fetchCalls.push({
            node,
            line: location.line,
            column: location.column,
            method: 'fetch',
          });
        }
      }
    },
  });

  return fetchCalls;
}

function findFetchCallsInComponent(componentPath: NodePath): FetchLocation[] {
  const fetchCalls: FetchLocation[] = [];

  componentPath.traverse({
    CallExpression(path) {
      // Skip if inside useEffect
      const parent = path.getFunctionParent();
      if (parent && isInsideUseEffect(parent)) {
        return;
      }

      const { node } = path;

      // Check for fetch patterns (similar to findFetchCallsInEffect)
      if (t.isIdentifier(node.callee) && node.callee.name === 'fetch') {
        const location = getNodeLocation(node);
        fetchCalls.push({
          node,
          line: location.line,
          column: location.column,
          method: 'fetch',
        });
      }
    },
  });

  return fetchCalls;
}

function isInsideUseEffect(path: NodePath): boolean {
  let current: NodePath | null = path;

  while (current) {
    const parent = current.parent;
    if (
      t.isCallExpression(parent) &&
      t.isIdentifier(parent.callee) &&
      parent.callee.name === 'useEffect'
    ) {
      return true;
    }
    current = current.parentPath;
  }

  return false;
}

function findSettersInEffect(effect: ReturnType<typeof findUseEffectCalls>[0]): string[] {
  const setters: string[] = [];

  if (!effect.callback) return setters;

  const callbackPath = effect.path.get('arguments.0') as NodePath;
  if (!callbackPath) return setters;

  callbackPath.traverse({
    CallExpression(path) {
      const { node } = path;

      // Check if it's a setter function
      if (t.isIdentifier(node.callee)) {
        const name = node.callee.name;
        if (name.startsWith('set') && name.length > 3 && /^set[A-Z]/.test(name)) {
          setters.push(name);
        }
      }
    },
  });

  return setters;
}

function findRelatedState(
  setters: string[],
  states: ReturnType<typeof findUseStateCalls>
): ReturnType<typeof findUseStateCalls>[0] | null {
  for (const setter of setters) {
    // Convert setter name to state name (setData -> data)
    const expectedStateName = setter.slice(3);
    const camelCaseStateName =
      expectedStateName.charAt(0).toLowerCase() + expectedStateName.slice(1);

    const relatedState = states.find(
      (s) => s.name === camelCaseStateName || s.name === expectedStateName
    );

    if (relatedState) return relatedState;
  }

  return null;
}

function isFetchRelatedInitialValue(stateCall: ReturnType<typeof findUseStateCalls>[0]): boolean {
  const name = stateCall.name.toLowerCase();

  // Skip common client-side patterns
  const clientPatterns = [
    'formdata',
    'form',
    'input',
    'selected',
    'isopen',
    'isclosed',
    'isvisible',
    'ishidden',
    'theme',
    'modal',
    'dropdown',
    'tab',
    'active',
  ];

  if (clientPatterns.some((pattern) => name.includes(pattern))) {
    return false;
  }

  // Check if name suggests server data
  const serverDataPatterns = [
    'users',
    'posts',
    'products',
    'items',
    'apidata',
    'results',
    'response',
    'orders',
    'customers',
    'articles',
    'comments',
    'profile',
    'settings',
    'config',
    'apiresponse',
  ];

  // Only flag as server data if it matches exact patterns or ends with 'data'
  return serverDataPatterns.some(
    (pattern) => name === pattern || name.startsWith(pattern) || name.endsWith(pattern)
  );
}
