import type { Rule } from '../types.js';
import { groupRelatedStateRule } from './group-related-state.js';
import { avoidStateContradictionsRule } from './avoid-state-contradictions.js';
import { avoidRedundantStateRule } from './avoid-redundant-state.js';

export const rules: Rule[] = [
  groupRelatedStateRule,
  avoidStateContradictionsRule,
  avoidRedundantStateRule
];