export interface AnalysisOptions {
  pattern: string;
  ignore: string[];
  format: 'text' | 'json' | 'markdown';
  fix: boolean;
  strict: boolean;
  verbose: boolean;
}

export interface Issue {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  suggestion?: string;
  fixable?: boolean;
}

export interface AnalysisResult {
  filesAnalyzed: number;
  filesFound: number;
  filesSkipped: string[];
  reactComponentsFound: number;
  issues: Issue[];
  stats: {
    errors: number;
    warnings: number;
    info: number;
    byRule: Record<string, number>;
  };
}

export interface Rule {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  check: (ast: any, filename: string) => Issue[];
}