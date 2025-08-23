import type { Rule } from '../types.js';
import { groupRelatedStateRule } from './group-related-state.js';
import { avoidStateContradictionsRule } from './avoid-state-contradictions.js';
import { avoidRedundantStateRule } from './avoid-redundant-state.js';
import { avoidDeeplyNestedStateRule } from './avoid-deeply-nested-state.js';
import { avoidStateDuplicationRule } from './avoid-state-duplication.js';
import { preferExplicitTransitionsRule } from './prefer-explicit-transitions.js';

export const rules: Rule[] = [
  groupRelatedStateRule,
  avoidStateContradictionsRule,
  avoidRedundantStateRule,
  avoidDeeplyNestedStateRule,
  avoidStateDuplicationRule,
  preferExplicitTransitionsRule
];