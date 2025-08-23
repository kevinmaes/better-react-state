import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

export interface StateCall {
  name: string;
  setterName: string;
  initialValue: any;
  node: t.CallExpression;
  path: NodePath<t.CallExpression>;
}

export function isReactComponent(path: NodePath): boolean {
  if (path.isFunctionDeclaration() || path.isFunctionExpression() || path.isArrowFunctionExpression()) {
    const node = path.node;
    
    // Check if function name starts with uppercase (component convention)
    if (path.isFunctionDeclaration() && node.id) {
      return /^[A-Z]/.test(node.id.name);
    }
    
    // Check if it's assigned to a variable with uppercase name
    const parent = path.parent;
    if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
      return /^[A-Z]/.test(parent.id.name);
    }
    
    // Check if it returns JSX
    let hasJSX = false;
    path.traverse({
      JSXElement() {
        hasJSX = true;
      },
      JSXFragment() {
        hasJSX = true;
      }
    });
    
    return hasJSX;
  }
  
  return false;
}

export function findUseStateCalls(componentPath: NodePath): StateCall[] {
  const stateCalls: StateCall[] = [];
  
  componentPath.traverse({
    CallExpression(path) {
      const { node } = path;
      
      // Check if it's a useState call
      if (
        t.isIdentifier(node.callee) && 
        node.callee.name === 'useState'
      ) {
        // Get the destructured names
        const parent = path.parent;
        if (t.isVariableDeclarator(parent) && t.isArrayPattern(parent.id)) {
          const [stateNode, setterNode] = parent.id.elements;
          
          if (t.isIdentifier(stateNode) && t.isIdentifier(setterNode)) {
            stateCalls.push({
              name: stateNode.name,
              setterName: setterNode.name,
              initialValue: node.arguments[0],
              node,
              path
            });
          }
        }
      }
    }
  });
  
  return stateCalls;
}

export function getNodeLocation(node: t.Node): { line: number; column: number } {
  return {
    line: node.loc?.start.line || 0,
    column: node.loc?.start.column || 0
  };
}