import kleur from 'kleur';
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
    console.log(
      kleur.bold(`\nFound ${results.issues.length} issues in ${results.filesAnalyzed} files:\n`)
    );

    // Group issues by file
    const byFile = results.issues.reduce(
      (acc, issue) => {
        if (!acc[issue.file]) acc[issue.file] = [];
        acc[issue.file].push(issue);
        return acc;
      },
      {} as Record<string, typeof results.issues>
    );

    for (const [file, issues] of Object.entries(byFile)) {
      console.log(kleur.underline(file));

      // Sort by severity (error > warning > info), then by line number
      const sortedIssues = issues.sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, info: 2 };
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return a.line - b.line;
      });

      for (const issue of sortedIssues) {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        const color =
          issue.severity === 'error'
            ? kleur.red
            : issue.severity === 'warning'
              ? kleur.yellow
              : kleur.blue;

        console.log(
          `  ${icon} ${color(`[${issue.rule}]`)} ${issue.message}`,
          kleur.gray(`(${issue.line}:${issue.column})`)
        );

        if (issue.suggestion) {
          console.log(kleur.gray(`     💡 ${issue.suggestion}`));
        }
      }
      console.log('');
    }

    // Summary
    console.log(kleur.bold('Summary:'));
    console.log(`  Errors: ${kleur.red(results.stats.errors)}`);
    console.log(`  Warnings: ${kleur.yellow(results.stats.warnings)}`);
    console.log(`  Info: ${kleur.blue(results.stats.info)}`);

    // Show XState detection in summary
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
      console.log(`  XState available: ${kleur.green('✓')} ${xstateInfo.join(', ')}`);
    }
  },

  reportMarkdown(results: AnalysisResult): void {
    console.log('# React State Analysis Report\n');
    console.log(`Analyzed ${results.filesAnalyzed} files\n`);

    if (results.issues.length === 0) {
      console.log('✨ No issues found!');
      return;
    }

    console.log('## Issues\n');

    const byFile = results.issues.reduce(
      (acc, issue) => {
        if (!acc[issue.file]) acc[issue.file] = [];
        acc[issue.file].push(issue);
        return acc;
      },
      {} as Record<string, typeof results.issues>
    );

    for (const [file, issues] of Object.entries(byFile)) {
      console.log(`### ${file}\n`);

      // Sort by severity (error > warning > info), then by line number
      const sortedIssues = issues.sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, info: 2 };
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return a.line - b.line;
      });

      for (const issue of sortedIssues) {
        const emoji =
          issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';

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

    // Show XState detection in markdown summary
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
      console.log(`- **XState available**: ✓ ${xstateInfo.join(', ')}`);
    }
  },
};
