import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { AnalysisOptions, AnalysisResult, Issue } from '../types.js';
import { rules } from '../rules/index.js';

export const analyzer = {
  async analyze(path: string, options: AnalysisOptions): Promise<AnalysisResult> {
    const files = await glob(options.pattern, {
      cwd: path,
      ignore: options.ignore,
      absolute: true
    });
    
    const issues: Issue[] = [];
    let filesAnalyzed = 0;
    
    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        const ast = parse(content, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        });
        
        // Run each rule on the AST
        for (const rule of rules) {
          const ruleIssues = rule.check(ast, file);
          issues.push(...ruleIssues);
        }
        
        filesAnalyzed++;
      } catch (error) {
        console.warn(`Skipping ${file}: ${error}`);
      }
    }
    
    // Calculate stats
    const stats = {
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
      byRule: issues.reduce((acc, issue) => {
        acc[issue.rule] = (acc[issue.rule] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    
    return {
      filesAnalyzed,
      issues,
      stats
    };
  }
};