#!/usr/bin/env node
import { Command } from 'commander';
import kleur from 'kleur';
import { analyzer } from './analyzer/index.js';
import { reporter } from './reporter/index.js';
import type { AnalysisOptions } from './types.js';

const program = new Command();

program
  .name('react-state-patterns')
  .description('Analyze and fix React state management antipatterns')
  .version('0.1.0')
  .argument('[path]', 'Path to analyze', '.')
  .option('-p, --pattern <pattern>', 'Glob pattern for files to analyze', '**/*.{jsx,tsx}')
  .option('-i, --ignore <patterns...>', 'Patterns to ignore', ['node_modules', 'dist', 'build'])
  .option('-f, --format <format>', 'Output format (text, json, markdown)', 'text')
  .option('--fix', 'Automatically fix issues (experimental)', false)
  .option('--strict', 'Exit with error code if issues found', false)
  .option('-v, --verbose', 'Show detailed analysis information', false)
  .action(async (path: string, options: AnalysisOptions) => {
    console.log(kleur.blue().bold('🔍 Analyzing React state patterns...\n'));

    try {
      const results = await analyzer.analyze(path, options);

      // Always show summary information
      if (options.verbose || results.filesFound === 0 || results.reactComponentsFound === 0) {
        console.log('📊 Analysis Summary:');
        console.log(`  Files found: ${results.filesFound}`);
        console.log(`  Files analyzed: ${results.filesAnalyzed}`);
        console.log(`  React components found: ${results.reactComponentsFound}`);
        if (results.filesSkipped.length > 0) {
          console.log(`  Files skipped: ${results.filesSkipped.length}`);
        }

        // Show XState detection
        if (results.projectContext?.hasXState || results.projectContext?.hasXStateStore) {
          const xstateInfo = [];
          if (results.projectContext.hasXState) {
            xstateInfo.push(
              `XState${results.projectContext.xstateVersion ? ` (${results.projectContext.xstateVersion})` : ''}`
            );
          }
          if (results.projectContext.hasXStateStore) {
            xstateInfo.push('@xstate/store');
          }
          console.log(`  XState available: ✓ ${xstateInfo.join(', ')}`);
        }

        console.log('');
      }

      if (results.filesFound === 0) {
        console.log(
          kleur.yellow('⚠️  No files found matching pattern:'),
          kleur.bold(options.pattern)
        );
        console.log(kleur.gray('💡 Try adjusting your pattern or path. Examples:'));
        console.log(kleur.gray('   react-state-patterns src --pattern "**/*.{js,jsx,ts,tsx}"'));
        console.log(kleur.gray('   react-state-patterns . --pattern "components/**/*.tsx"'));
        process.exit(0);
      }

      if (results.reactComponentsFound === 0) {
        console.log(kleur.yellow('⚠️  No React components found in analyzed files'));
        console.log(kleur.gray('💡 This tool analyzes React components with useState/useReducer'));
        console.log(
          kleur.gray("   Make sure you're pointing to files that contain React components")
        );
        process.exit(0);
      }

      if (results.issues.length === 0) {
        console.log(kleur.green('✨ No state management issues found!'));
        console.log(
          kleur.gray(
            `   Analyzed ${results.reactComponentsFound} React component${results.reactComponentsFound !== 1 ? 's' : ''} in ${results.filesAnalyzed} file${results.filesAnalyzed !== 1 ? 's' : ''}`
          )
        );
        process.exit(0);
      }

      reporter.report(results, options.format);

      if (options.fix) {
        console.log(
          kleur.yellow('\n🔧 Auto-fix is experimental. Please review changes carefully.')
        );
        // TODO: Implement auto-fix functionality
      }

      if (options.strict && results.issues.length > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(kleur.red('❌ Error:'), error);
      process.exit(1);
    }
  });

program.parse();
