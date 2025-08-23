import chalk from 'chalk';
import type { AnalysisResult } from '../types.js';

export const reporter = {
  report(results: AnalysisResult, format: string): void {
    switch (format) {
      case 'json':
        console.log(JSON.stringify(results, null, 2));
        break;
      case 'markdown':
        this.reportMarkdown(results);
        break;
      case 'text':
      default:
        this.reportText(results);
    }
  },
  
  reportText(results: AnalysisResult): void {
    console.log(chalk.bold(`\nFound ${results.issues.length} issues in ${results.filesAnalyzed} files:\n`));
    
    // Group issues by file
    const byFile = results.issues.reduce((acc, issue) => {
      if (!acc[issue.file]) acc[issue.file] = [];
      acc[issue.file].push(issue);
      return acc;
    }, {} as Record<string, typeof results.issues>);
    
    for (const [file, issues] of Object.entries(byFile)) {
      console.log(chalk.underline(file));
      
      for (const issue of issues) {
        const icon = issue.severity === 'error' ? '❌' : 
                    issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        const color = issue.severity === 'error' ? chalk.red :
                     issue.severity === 'warning' ? chalk.yellow : chalk.blue;
        
        console.log(
          `  ${icon} ${color(`[${issue.rule}]`)} ${issue.message}`,
          chalk.gray(`(${issue.line}:${issue.column})`)
        );
        
        if (issue.suggestion) {
          console.log(chalk.gray(`     💡 ${issue.suggestion}`));
        }
      }
      console.log('');
    }
    
    // Summary
    console.log(chalk.bold('Summary:'));
    console.log(`  Errors: ${chalk.red(results.stats.errors)}`);
    console.log(`  Warnings: ${chalk.yellow(results.stats.warnings)}`);
    console.log(`  Info: ${chalk.blue(results.stats.info)}`);
  },
  
  reportMarkdown(results: AnalysisResult): void {
    console.log('# React State Analysis Report\n');
    console.log(`Analyzed ${results.filesAnalyzed} files\n`);
    
    if (results.issues.length === 0) {
      console.log('✨ No issues found!');
      return;
    }
    
    console.log('## Issues\n');
    
    const byFile = results.issues.reduce((acc, issue) => {
      if (!acc[issue.file]) acc[issue.file] = [];
      acc[issue.file].push(issue);
      return acc;
    }, {} as Record<string, typeof results.issues>);
    
    for (const [file, issues] of Object.entries(byFile)) {
      console.log(`### ${file}\n`);
      
      for (const issue of issues) {
        const emoji = issue.severity === 'error' ? '🔴' :
                     issue.severity === 'warning' ? '🟡' : '🔵';
        
        console.log(`- ${emoji} **[${issue.rule}]** ${issue.message} _(line ${issue.line})_`);
        if (issue.suggestion) {
          console.log(`  - 💡 ${issue.suggestion}`);
        }
      }
      console.log('');
    }
    
    console.log('## Summary\n');
    console.log(`- **Errors**: ${results.stats.errors}`);
    console.log(`- **Warnings**: ${results.stats.warnings}`);
    console.log(`- **Info**: ${results.stats.info}`);
  }
};