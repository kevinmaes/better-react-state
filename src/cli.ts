#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { analyzer } from './analyzer/index.js';
import { reporter } from './reporter/index.js';
import type { AnalysisOptions } from './types.js';

const program = new Command();

program
  .name('fix-react-state')
  .description('Analyze and fix React state management antipatterns')
  .version('0.1.0')
  .argument('[path]', 'Path to analyze', '.')
  .option('-p, --pattern <pattern>', 'Glob pattern for files to analyze', '**/*.{jsx,tsx}')
  .option('-i, --ignore <patterns...>', 'Patterns to ignore', ['node_modules', 'dist', 'build'])
  .option('-f, --format <format>', 'Output format (text, json, markdown)', 'text')
  .option('--fix', 'Automatically fix issues (experimental)', false)
  .option('--strict', 'Exit with error code if issues found', false)
  .action(async (path: string, options: AnalysisOptions) => {
    console.log(chalk.blue.bold('🔍 Analyzing React state patterns...\n'));
    
    try {
      const results = await analyzer.analyze(path, options);
      
      if (results.issues.length === 0) {
        console.log(chalk.green('✨ No state management issues found!'));
        process.exit(0);
      }
      
      reporter.report(results, options.format);
      
      if (options.fix) {
        console.log(chalk.yellow('\n🔧 Auto-fix is experimental. Please review changes carefully.'));
        // TODO: Implement auto-fix functionality
      }
      
      if (options.strict && results.issues.length > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error);
      process.exit(1);
    }
  });

program.parse();