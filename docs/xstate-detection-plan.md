# XState Detection Implementation Plan

## Overview

Enhance fix-react-state to detect existing XState usage and provide context-aware suggestions.

## Detection Strategy

### 1. Package Detection

Check for XState in dependencies:

```typescript
// In analyzer
async function detectXStateInProject(projectPath: string): Promise<{
  hasXState: boolean;
  hasXStateStore: boolean;
  version?: string;
}> {
  try {
    const packageJson = await readFile(path.join(projectPath, 'package.json'), 'utf-8');
    const pkg = JSON.parse(packageJson);

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    return {
      hasXState: '@xstate/react' in deps || 'xstate' in deps,
      hasXStateStore: '@xstate/store' in deps,
      version: deps['xstate'] || deps['@xstate/react'],
    };
  } catch {
    return { hasXState: false, hasXStateStore: false };
  }
}
```

### 2. Import Detection

Check for XState imports in analyzed files:

```typescript
function detectXStateImports(ast: any): {
  usesXState: boolean;
  usesXStateStore: boolean;
  importTypes: string[];
} {
  const imports = {
    usesXState: false,
    usesXStateStore: false,
    importTypes: [],
  };

  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value;

      if (source === 'xstate' || source === '@xstate/react') {
        imports.usesXState = true;
        imports.importTypes.push('xstate');
      }

      if (source === '@xstate/store') {
        imports.usesXStateStore = true;
        imports.importTypes.push('store');
      }
    },
  });

  return imports;
}
```

### 3. Usage Pattern Detection

Detect actual XState usage patterns:

```typescript
function detectXStatePatterns(ast: any): {
  usesMachine: boolean;
  usesStore: boolean;
  usesActor: boolean;
} {
  // Detect patterns like:
  // - createMachine()
  // - createStore()
  // - useMachine()
  // - useActor()
  // - useSelector()
}
```

## Enhanced Suggestion Logic

### Context-Aware Suggestions

```typescript
function getSuggestion(complexity: string, projectContext: ProjectContext): string {
  const { hasXState, hasXStateStore } = projectContext;

  if (complexity === 'moderate') {
    if (hasXStateStore) {
      return 'Consider using @xstate/store (already in your project) for atomic, event-driven updates';
    } else if (hasXState) {
      return 'Consider using useReducer or adding @xstate/store for simpler state management';
    } else {
      return 'Consider using useReducer for better state organization';
    }
  }

  if (complexity === 'complex') {
    if (hasXState) {
      return 'Consider using XState (already in your project) for complex state orchestration';
    } else if (hasXStateStore) {
      return 'Consider upgrading to full XState for complex state machines, or use @xstate/store for simpler cases';
    } else {
      return 'Consider using useReducer or exploring XState for complex state orchestration';
    }
  }

  return 'Consider using useReducer for better state organization';
}
```

## Implementation Steps

### Phase 1: Basic Detection

1. Add package.json detection to analyzer
2. Store XState availability in AnalysisResult
3. Pass context to rules

### Phase 2: Import Detection

1. Add import detection to each file analysis
2. Track which components use XState
3. Don't suggest XState to components already using it

### Phase 3: Smart Suggestions

1. Update all relevant rules to use context
2. Provide migration-aware suggestions
3. Show examples using their existing tools

## Example Output

### When XState is detected:

```
📊 Analysis Summary:
  Files analyzed: 10
  React components found: 15
  XState detected: ✓ (@xstate/react@5.0.0, @xstate/store@2.0.0)

/src/components/ComplexForm.tsx
  ℹ️ [prefer-explicit-transitions] Component has 8 state variables with complex patterns
     💡 Consider using XState (already in your project) for state orchestration
     📚 Example: createMachine({ initial: 'idle', states: { idle, loading, success, error } })
```

### When XState is NOT detected:

```
/src/components/ComplexForm.tsx
  ℹ️ [prefer-explicit-transitions] Component has 8 state variables with complex patterns
     💡 Consider using useReducer or exploring XState for complex state orchestration
     📚 Learn more: https://xstate.js.org/docs/
```

## Benefits

1. **Contextual**: Suggestions match the project's existing tools
2. **Practical**: Don't suggest tools they don't have for simple fixes
3. **Educational**: Helps teams already using XState to use it more
4. **Progressive**: Guides natural progression: useState → useReducer → XState/store → XState

## Future Enhancements

1. **Detect XState version**: Suggest v5 features if using v4
2. **Framework detection**: Next.js, Remix, etc. may influence suggestions
3. **Config file**: Allow teams to set preferences for suggestions
4. **Codemod support**: Help migrate from detected patterns to XState
