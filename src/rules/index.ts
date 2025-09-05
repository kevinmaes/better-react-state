import type { Rule } from '../types.js';
import { groupRelatedStateRule } from './group-related-state.js';
import { avoidStateContradictionsRule } from './avoid-state-contradictions.js';
import { avoidRedundantStateRule } from './avoid-redundant-state.js';
import { avoidDeeplyNestedStateRule } from './avoid-deeply-nested-state.js';
import { avoidStateDuplicationRule } from './avoid-state-duplication.js';
import { preferExplicitTransitionsRule } from './prefer-explicit-transitions.js';
import { detectStateInUseEffectRule } from './detect-state-in-useeffect.js';
import { detectPropDrillingRule } from './detect-prop-drilling.js';
import { stateVsRefsRule } from './state-vs-refs.js';
import { serverVsClientStateRule } from './server-vs-client-state.js';

export const rules: Rule[] = [
  groupRelatedStateRule,
  avoidStateContradictionsRule,
  avoidRedundantStateRule,
  avoidDeeplyNestedStateRule,
  avoidStateDuplicationRule,
  preferExplicitTransitionsRule,
  detectStateInUseEffectRule,
  detectPropDrillingRule,
  stateVsRefsRule,
  serverVsClientStateRule,
];
