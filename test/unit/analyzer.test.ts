import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzer } from '../../src/analyzer/index';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import type { AnalysisOptions } from '../../src/types';

// Mock the modules
vi.mock('fs/promises');
vi.mock('glob');

describe('analyzer', () => {
  const mockOptions: AnalysisOptions = {
    pattern: '**/*.tsx',
    ignore: ['node_modules/**'],
    format: 'text',
    fix: false,
    strict: false,
    verbose: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should analyze files matching the pattern', async () => {
    // Mock glob to return test files
    vi.mocked(glob).mockResolvedValue([
      '/project/src/Component1.tsx',
      '/project/src/Component2.tsx',
    ]);

    // Mock file contents
    const mockComponentCode = `
      import React, { useState } from 'react';
      
      export function TestComponent() {
        const [firstName, setFirstName] = useState('');
        const [lastName, setLastName] = useState('');
        
        return <div>{firstName} {lastName}</div>;
      }
    `;

    vi.mocked(fs.readFile).mockResolvedValue(mockComponentCode);

    const result = await analyzer.analyze('/project', mockOptions);

    expect(glob).toHaveBeenCalledWith('**/*.tsx', {
      cwd: '/project',
      ignore: ['node_modules/**'],
      absolute: true,
    });

    expect(result.filesAnalyzed).toBe(2);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.stats).toBeDefined();
  });

  it('should handle parse errors gracefully', async () => {
    vi.mocked(glob).mockResolvedValue(['/project/src/Invalid.tsx']);

    // Mock invalid JavaScript
    vi.mocked(fs.readFile).mockResolvedValue('const invalid syntax {');

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await analyzer.analyze('/project', mockOptions);

    expect(result.filesAnalyzed).toBe(0);
    expect(result.issues).toHaveLength(0);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping /project/src/Invalid.tsx:')
    );

    consoleWarnSpy.mockRestore();
  });

  it('should calculate correct statistics', async () => {
    vi.mocked(glob).mockResolvedValue(['/project/src/Component.tsx']);

    // Mock component with multiple issues
    const mockCode = `
      import React, { useState } from 'react';
      
      export function BadComponent() {
        const [isLoading, setIsLoading] = useState(false);
        const [hasError, setHasError] = useState(false);
        const [isSuccess, setIsSuccess] = useState(false);
        
        return <div>Status</div>;
      }
    `;

    vi.mocked(fs.readFile).mockResolvedValue(mockCode);

    const result = await analyzer.analyze('/project', mockOptions);

    expect(result.stats.errors).toBeGreaterThanOrEqual(0);
    expect(result.stats.warnings).toBeGreaterThanOrEqual(0);
    expect(result.stats.info).toBeGreaterThanOrEqual(0);
    expect(result.stats.byRule).toBeDefined();
    expect(Object.keys(result.stats.byRule).length).toBeGreaterThan(0);
  });

  it('should handle empty file list', async () => {
    vi.mocked(glob).mockResolvedValue([]);

    const result = await analyzer.analyze('/project', mockOptions);

    expect(result.filesAnalyzed).toBe(0);
    expect(result.issues).toHaveLength(0);
    expect(result.stats.errors).toBe(0);
    expect(result.stats.warnings).toBe(0);
    expect(result.stats.info).toBe(0);
  });

  it('should handle file read errors', async () => {
    vi.mocked(glob).mockResolvedValue(['/project/src/Component.tsx']);

    vi.mocked(fs.readFile).mockRejectedValue(new Error('Permission denied'));

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await analyzer.analyze('/project', mockOptions);

    expect(result.filesAnalyzed).toBe(0);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Skipping /project/src/Component.tsx: Error: Permission denied'
    );

    consoleWarnSpy.mockRestore();
  });

  it('should respect ignore patterns', async () => {
    const optionsWithIgnore: AnalysisOptions = {
      ...mockOptions,
      ignore: ['node_modules/**', 'dist/**', '*.test.tsx'],
    };

    vi.mocked(glob).mockResolvedValue([]);

    await analyzer.analyze('/project', optionsWithIgnore);

    expect(glob).toHaveBeenCalledWith('**/*.tsx', {
      cwd: '/project',
      ignore: ['node_modules/**', 'dist/**', '*.test.tsx'],
      absolute: true,
    });
  });

  it('should run all rules on each file', async () => {
    vi.mocked(glob).mockResolvedValue(['/project/src/Component.tsx']);

    const mockCode = `
      import React, { useState } from 'react';
      
      export function MultiIssueComponent() {
        // Related state that should be grouped
        const [firstName, setFirstName] = useState('');
        const [lastName, setLastName] = useState('');
        
        // Contradicting boolean states
        const [isOpen, setIsOpen] = useState(false);
        const [isClosed, setIsClosed] = useState(true);
        
        // Deeply nested state
        const [user, setUser] = useState({
          profile: {
            personal: {
              details: {
                name: ''
              }
            }
          }
        });
        
        return <div>{firstName}</div>;
      }
    `;

    vi.mocked(fs.readFile).mockResolvedValue(mockCode);

    const result = await analyzer.analyze('/project', mockOptions);

    // Should have issues from multiple rules
    const ruleNames = new Set(result.issues.map((issue) => issue.rule));
    expect(ruleNames.size).toBeGreaterThan(1);

    // Check that we have issues from different rules
    expect(result.stats.byRule).toBeDefined();
    expect(Object.keys(result.stats.byRule).length).toBeGreaterThan(1);
  });

  it('should provide correct file paths in issues', async () => {
    const testFile = '/project/src/TestComponent.tsx';
    vi.mocked(glob).mockResolvedValue([testFile]);

    const mockCode = `
      import React, { useState } from 'react';
      
      export function TestComponent() {
        const [count, setCount] = useState(0);
        const [total, setTotal] = useState(0);
        
        return <div>{count} of {total}</div>;
      }
    `;

    vi.mocked(fs.readFile).mockResolvedValue(mockCode);

    const result = await analyzer.analyze('/project', mockOptions);

    // All issues should have the correct file path
    result.issues.forEach((issue) => {
      expect(issue.file).toBe(testFile);
    });
  });
});
