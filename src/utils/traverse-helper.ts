import traverse from '@babel/traverse';
import type { NodePath, Binding, TraverseOptions } from '@babel/traverse';
import type { Node } from '@babel/types';

type TraverseFunction = (ast: Node, opts?: TraverseOptions) => void;

// Type-safe wrapper for traverse function that handles both CJS and ESM exports
export function getTraverse(): TraverseFunction {
  // Handle both default and named exports from babel traverse
  return typeof traverse === 'function'
    ? traverse
    : (traverse as unknown as { default: TraverseFunction }).default;
}

// Export the types for convenience
export type { NodePath, Binding };
