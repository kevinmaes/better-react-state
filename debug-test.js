import { readFileSync } from 'fs';
import { parse } from '@babel/parser';
import { stateVsRefsRule } from './src/rules/state-vs-refs.js';

const code = readFileSync('test/fixtures/state-vs-refs.tsx', 'utf-8');
const ast = parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript'],
});

const issues = stateVsRefsRule.check(ast, 'test.tsx');

console.log('Total issues found:', issues.length);
issues.forEach((issue, index) => {
  console.log(`${index + 1}. ${issue.message} (line ${issue.line})`);
});

console.log('\nAll state names found in issues:');
const stateNames = issues.map((i) => i.message.match(/State '(\w+)'/)?.[1]).filter(Boolean);
console.log(stateNames);
