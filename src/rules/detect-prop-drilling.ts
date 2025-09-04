import { getTraverse } from '../utils/traverse-helper.js';
import { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { Rule, Issue, ProjectContext } from '../types.js';
import { isReactComponent, getNodeLocation } from '../utils/ast-helpers.js';

interface PropUsage {
  componentName: string;
  propName: string;
  isUsedInComponent: boolean;
  isPassedToChild: boolean;
  path: NodePath;
  location: { line: number; column: number };
}

/**
 * Detects prop drilling - when props are passed through multiple
 * intermediate components without being used
 */
export const detectPropDrillingRule: Rule = {
  name: 'detect-prop-drilling',
  description:
    'Props should not be drilled through multiple component layers (warning for 2 levels, error for 3+ levels)',
  severity: 'warning',

  check(ast: t.File, filename: string, _context?: ProjectContext): Issue[] {
    const issues: Issue[] = [];
    const componentProps = new Map<string, PropUsage[]>();

    const traverse = getTraverse();

    // First pass: collect all component definitions and their prop usage
    traverse(ast, {
      FunctionDeclaration(path: NodePath) {
        if (isReactComponent(path)) {
          analyzeComponent(path, componentProps);
        }
      },
      FunctionExpression(path: NodePath) {
        if (isReactComponent(path)) {
          analyzeComponent(path, componentProps);
        }
      },
      ArrowFunctionExpression(path: NodePath) {
        if (isReactComponent(path)) {
          analyzeComponent(path, componentProps);
        }
      },
    });

    // Second pass: analyze prop drilling patterns
    const drilledProps = detectDrilledProps(componentProps);

    // Create issues for detected prop drilling
    for (const [propName, components] of drilledProps.entries()) {
      // Find the first component that just passes the prop
      const firstDriller = components.find((c) => !c.isUsedInComponent && c.isPassedToChild);

      if (firstDriller) {
        const chainDescription = components.map((c) => c.componentName).join(' → ');

        // Use graduated severity: warning for 2 levels, error for 3+ levels
        const severity = components.length >= 3 ? 'error' : 'warning';
        const severityText = severity === 'error' ? 'deep prop drilling' : 'prop drilling';

        issues.push({
          rule: 'detect-prop-drilling',
          severity,
          message: `Prop "${propName}" is drilled through ${components.length} components (${chainDescription}) without being used in intermediate components - ${severityText} detected`,
          file: filename,
          line: firstDriller.location.line,
          column: firstDriller.location.column,
          suggestion:
            severity === 'error'
              ? `Critical: Use React Context or component composition to eliminate this deep prop drilling for "${propName}"`
              : `Consider using React Context for "${propName}" or use component composition to avoid prop drilling`,
          fixable: false,
        });
      }
    }

    return issues;
  },
};

function analyzeComponent(path: NodePath, componentProps: Map<string, PropUsage[]>): void {
  const componentName = getComponentName(path);
  if (!componentName) return;

  const props = extractProps(path);
  const propUsages: PropUsage[] = [];

  for (const propName of props) {
    const usage = analyzePropUsage(path, propName, componentName);
    if (usage) {
      propUsages.push(usage);
    }
  }

  componentProps.set(componentName, propUsages);
}

function getComponentName(path: NodePath): string | null {
  const node = path.node;

  // Function declaration with name
  if (path.isFunctionDeclaration() && (node as t.FunctionDeclaration).id) {
    return (node as t.FunctionDeclaration).id!.name;
  }

  // Variable declarator (const Component = () => {})
  const parent = path.parent;
  if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
    return parent.id.name;
  }

  // Export default function
  if (t.isExportDefaultDeclaration(parent)) {
    // Try to find the name from the export
    if (path.isFunctionDeclaration() && (node as t.FunctionDeclaration).id) {
      return (node as t.FunctionDeclaration).id!.name;
    }
    return 'DefaultExport';
  }

  return null;
}

function extractProps(componentPath: NodePath): Set<string> {
  const props = new Set<string>();
  const functionNode = componentPath.node as t.Function;
  const params = functionNode.params;

  if (params.length > 0) {
    const firstParam = params[0];

    // Destructured props: function Component({ prop1, prop2 })
    if (t.isObjectPattern(firstParam)) {
      firstParam.properties.forEach((prop) => {
        if (t.isObjectProperty(prop)) {
          if (t.isIdentifier(prop.key)) {
            props.add(prop.key.name);
          }
        } else if (t.isRestElement(prop)) {
          // Handle ...rest props
          if (t.isIdentifier(prop.argument)) {
            // Track that this component uses spread props
            props.add('...' + prop.argument.name);
          }
        }
      });
    }
    // Props object: function Component(props)
    else if (t.isIdentifier(firstParam)) {
      const propsObjectName = firstParam.name;

      // Find all props.xyz accesses
      componentPath.traverse({
        MemberExpression(memberPath: NodePath<t.MemberExpression>) {
          if (
            t.isIdentifier(memberPath.node.object) &&
            memberPath.node.object.name === propsObjectName &&
            t.isIdentifier(memberPath.node.property) &&
            !memberPath.node.computed
          ) {
            props.add(memberPath.node.property.name);
          }
        },
      });
    }
  }

  return props;
}

function analyzePropUsage(
  componentPath: NodePath,
  propName: string,
  componentName: string
): PropUsage | null {
  let isUsedInComponent = false;
  let isPassedToChild = false;
  const location = getNodeLocation(componentPath.node);

  // Handle spread props specially
  if (propName.startsWith('...')) {
    const restName = propName.substring(3);
    componentPath.traverse({
      JSXSpreadAttribute(spreadPath: NodePath<t.JSXSpreadAttribute>) {
        if (
          t.isIdentifier(spreadPath.node.argument) &&
          spreadPath.node.argument.name === restName
        ) {
          isPassedToChild = true;
        }
      },
    });

    return {
      componentName,
      propName: restName + ' (spread)',
      isUsedInComponent: false, // Spread props are typically just forwarded
      isPassedToChild,
      path: componentPath,
      location,
    };
  }

  // Track where the prop is used
  componentPath.traverse({
    Identifier(idPath: NodePath<t.Identifier>) {
      if (idPath.node.name !== propName) return;

      const parent = idPath.parent;

      // Skip if it's a property key in object pattern (destructuring)
      if (t.isObjectProperty(parent) && parent.key === idPath.node) {
        return;
      }

      // Check if used in JSX as a prop
      if (t.isJSXAttribute(parent)) {
        isPassedToChild = true;
        return;
      }

      // Check if used in JSXExpressionContainer within JSXAttribute
      if (t.isJSXExpressionContainer(parent)) {
        const grandParent = idPath.parentPath?.parent;
        if (t.isJSXAttribute(grandParent)) {
          isPassedToChild = true;
          return;
        }
      }

      // Check if used in JSX spread
      if (t.isJSXSpreadAttribute(parent)) {
        isPassedToChild = true;
        return;
      }

      // Check if it's actually being used in the component logic
      // (not just passed to another component)
      const jsxAncestor = idPath.findParent(
        (p) => p.isJSXElement() || p.isJSXAttribute() || p.isJSXSpreadAttribute()
      );

      if (!jsxAncestor || (!jsxAncestor.isJSXAttribute() && !jsxAncestor.isJSXSpreadAttribute())) {
        // Used in component logic (conditionals, calculations, etc.)
        // But not if it's just being assigned in destructuring
        if (!t.isObjectProperty(parent) || parent.value === idPath.node) {
          isUsedInComponent = true;
        }
      }
    },
  });

  // Also check for props.propName pattern
  const functionNode = componentPath.node as t.Function;
  const firstParam = functionNode.params[0];
  if (firstParam && t.isIdentifier(firstParam)) {
    const propsObjectName = firstParam.name;

    componentPath.traverse({
      MemberExpression(memberPath: NodePath<t.MemberExpression>) {
        if (
          t.isIdentifier(memberPath.node.object) &&
          memberPath.node.object.name === propsObjectName &&
          t.isIdentifier(memberPath.node.property) &&
          memberPath.node.property.name === propName
        ) {
          const parent = memberPath.parent;

          // Check if it's passed as a prop to child component
          if (t.isJSXExpressionContainer(parent)) {
            const jsxParent = memberPath.findParent((p) => p.isJSXAttribute());
            if (jsxParent) {
              isPassedToChild = true;
              return;
            }
          }

          // Otherwise it's used in component logic
          isUsedInComponent = true;
        }
      },
    });
  }

  return {
    componentName,
    propName,
    isUsedInComponent,
    isPassedToChild,
    path: componentPath,
    location,
  };
}

function detectDrilledProps(componentProps: Map<string, PropUsage[]>): Map<string, PropUsage[]> {
  const drilledProps = new Map<string, PropUsage[]>();

  // Group usages by prop name
  const propsByName = new Map<string, PropUsage[]>();

  for (const [_componentName, usages] of componentProps.entries()) {
    for (const usage of usages) {
      if (!propsByName.has(usage.propName)) {
        propsByName.set(usage.propName, []);
      }
      propsByName.get(usage.propName)!.push(usage);
    }
  }

  // Analyze each prop to detect drilling patterns
  for (const [propName, usages] of propsByName.entries()) {
    // Skip spread props for now
    if (propName.includes('spread')) continue;

    // Count all components that handle this prop (drillers + final consumer)
    const allComponents: PropUsage[] = [];

    // Add all drillers (components that pass but don't use)
    const drillers = usages.filter((u) => !u.isUsedInComponent && u.isPassedToChild);
    allComponents.push(...drillers);

    // Add final consumers (components that actually use the prop)
    const consumers = usages.filter((u) => u.isUsedInComponent);
    allComponents.push(...consumers);

    // We need at least one intermediate component that drills
    // and at least one usage total (either drilling or consuming)
    if (drillers.length >= 1 && allComponents.length >= 2) {
      drilledProps.set(propName, allComponents);
    }
  }

  return drilledProps;
}
