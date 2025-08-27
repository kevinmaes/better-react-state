import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { type NodePath } from '@babel/traverse';
import path from 'path';
import type { AnalysisOptions, AnalysisResult, Issue, ProjectContext } from '../types.js';
import { rules } from '../rules/index.js';
import { isReactComponent } from '../utils/ast-helpers.js';

async function detectProjectContext(projectPath: string): Promise<ProjectContext> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = await readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(packageJson);

    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

    return {
      hasXState: '@xstate/react' in allDeps || 'xstate' in allDeps,
      hasXStateStore: '@xstate/store' in allDeps,
      xstateVersion: allDeps['xstate'] || allDeps['@xstate/react'],
    };
  } catch (error) {
    // No package.json or error reading it
    return {
      hasXState: false,
      hasXStateStore: false,
    };
  }
}

export const analyzer = {
  async analyze(projectPath: string, options: AnalysisOptions): Promise<AnalysisResult> {
    // Detect project context first
    const projectContext = await detectProjectContext(projectPath);
    const files = await glob(options.pattern, {
      cwd: projectPath,
      ignore: options.ignore,
      absolute: true,
    });

    if (options.verbose) {
      console.log(`🔍 Found ${files.length} files matching pattern: ${options.pattern}`);
      if (files.length > 0) {
        console.log('📁 Files to analyze:');
        files.forEach((file) => console.log(`  - ${file}`));
      }
    }

    const issues: Issue[] = [];
    const filesSkipped: string[] = [];
    let filesAnalyzed = 0;
    let reactComponentsFound = 0;

    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        const ast = parse(content, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript'],
        });

        // Count React components in this file
        let componentsInFile = 0;
        const traverseFn = typeof traverse === 'function' ? traverse : (traverse as any).default;
        traverseFn(ast, {
          FunctionDeclaration(path: NodePath) {
            if (isReactComponent(path)) componentsInFile++;
          },
          FunctionExpression(path: NodePath) {
            if (isReactComponent(path)) componentsInFile++;
          },
          ArrowFunctionExpression(path: NodePath) {
            if (isReactComponent(path)) componentsInFile++;
          },
        });

        reactComponentsFound += componentsInFile;

        if (options.verbose) {
          console.log(
            `📄 ${file}: ${componentsInFile} React component${componentsInFile !== 1 ? 's' : ''} found`
          );
        }

        // Run each rule on the AST with project context
        for (const rule of rules) {
          const ruleIssues = rule.check(ast, file, projectContext);
          issues.push(...ruleIssues);
        }

        filesAnalyzed++;
      } catch (error) {
        filesSkipped.push(file);
        if (options.verbose) {
          console.warn(`⚠️ Skipping ${file}: ${error}`);
        } else {
          console.warn(`Skipping ${file}: ${error}`);
        }
      }
    }

    // Calculate stats
    const stats = {
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      info: issues.filter((i) => i.severity === 'info').length,
      byRule: issues.reduce(
        (acc, issue) => {
          acc[issue.rule] = (acc[issue.rule] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };

    return {
      filesAnalyzed,
      filesFound: files.length,
      filesSkipped,
      reactComponentsFound,
      projectContext,
      issues,
      stats,
    };
  },
};
