import { getTraverse } from '../utils/traverse-helper.js';
import { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { Rule, Issue, ProjectContext } from '../types.js';
import {
  isReactComponent,
  findUseStateCalls,
  getNodeLocation,
  type StateCall,
} from '../utils/ast-helpers.js';

/**
 * Detects complex forms with many individual useState calls that would benefit
 * from form libraries or more sophisticated state management.
 */
export const formStatePatternsRule: Rule = {
  name: 'form-state-patterns',
  description:
    'Complex forms with many state variables should use form libraries or unified state management',
  severity: 'warning',

  check(ast: t.File, filename: string, _context?: ProjectContext): Issue[] {
    const issues: Issue[] = [];

    const traverse = getTraverse();
    traverse(ast, {
      FunctionDeclaration(path: NodePath) {
        if (isReactComponent(path)) {
          checkComponent(path, filename, issues);
        }
      },
      FunctionExpression(path: NodePath) {
        if (isReactComponent(path)) {
          checkComponent(path, filename, issues);
        }
      },
      ArrowFunctionExpression(path: NodePath) {
        if (isReactComponent(path)) {
          checkComponent(path, filename, issues);
        }
      },
    });

    return issues;
  },
};

function checkComponent(path: NodePath, filename: string, issues: Issue[]): void {
  const stateCalls = findUseStateCalls(path);

  if (stateCalls.length === 0) return;

  const formFields = identifyFormFields(stateCalls);
  const validationStates = identifyValidationStates(stateCalls);
  const totalFormStates = formFields.length + validationStates.length;

  // Check for manual reset pattern
  const hasManualReset = hasManualResetPattern(path, [...formFields, ...validationStates]);

  // Warn at 7+ form-related states, error at 12+
  if (totalFormStates >= 7) {
    const firstState = formFields[0] || validationStates[0];
    const location = getNodeLocation(firstState.node);

    const severity = totalFormStates >= 12 ? 'error' : 'warning';
    const fieldNames = formFields.map((s) => s.name);
    const validationNames = validationStates.map((s) => s.name);

    let message = `Found ${totalFormStates} form-related state variables. `;
    message += `Consider using a form library or unified state management.`;

    if (hasManualReset) {
      message += ` Manual reset pattern detected.`;
    }

    let suggestion = getSuggestion(totalFormStates, fieldNames, validationNames, hasManualReset);

    issues.push({
      rule: 'form-state-patterns',
      severity,
      message,
      file: filename,
      line: location.line,
      column: location.column,
      suggestion,
      fixable: true,
    });
  }
}

function identifyFormFields(stateCalls: StateCall[]): StateCall[] {
  return stateCalls.filter((state) => {
    const name = state.name.toLowerCase();

    // Common form field patterns
    const formFieldPatterns = [
      // Basic fields
      /^(first|last|middle)?name$/,
      /^email$/,
      /^password$/,
      /^confirm(password|email)$/,
      /^phone(number)?$/,
      /^address$/,
      /^(street|city|state|zip|postal|country)$/,
      /^(birth|start|end)date$/,
      /^age$/,
      /^gender$/,
      /^title$/,
      /^description$/,
      /^message$/,
      /^comment$/,
      /^notes?$/,
      /^company$/,
      /^position$/,
      /^website$/,
      /^url$/,

      // Generic field patterns
      /^.*(name|email|phone|address|date|time|value)$/,
      /^(selected|current|chosen).+$/,

      // Multi-word form fields
      /^(billing|shipping|contact|personal|work).+$/,
    ];

    return formFieldPatterns.some((pattern) => pattern.test(name));
  });
}

function identifyValidationStates(stateCalls: StateCall[]): StateCall[] {
  return stateCalls.filter((state) => {
    const name = state.name.toLowerCase();

    // Validation state patterns
    const validationPatterns = [
      /error$/,
      /errors$/,
      /valid$/,
      /invalid$/,
      /touched$/,
      /dirty$/,
      /pristine$/,
      /^is.*valid$/,
      /^is.*invalid$/,
      /^is.*touched$/,
      /^is.*dirty$/,
      /^has.*error$/,
      /^show.*error$/,
      /validating$/,
      /^is.*validating$/,
    ];

    return validationPatterns.some((pattern) => pattern.test(name));
  });
}

function hasManualResetPattern(componentPath: NodePath, formStates: StateCall[]): boolean {
  let hasResetPattern = false;
  const stateSetters = new Set(formStates.map((s) => s.setterName));

  componentPath.traverse({
    FunctionDeclaration(path) {
      if (path.node.id?.name.toLowerCase().includes('reset')) {
        checkForMultipleSetterCalls(path, stateSetters, (count) => {
          if (count >= 3) hasResetPattern = true;
        });
      }
    },
    FunctionExpression(path) {
      // Check if assigned to variable with "reset" in name
      const parent = path.parent;
      if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
        if (parent.id.name.toLowerCase().includes('reset')) {
          checkForMultipleSetterCalls(path, stateSetters, (count) => {
            if (count >= 3) hasResetPattern = true;
          });
        }
      }
    },
    ArrowFunctionExpression(path) {
      // Check if assigned to variable with "reset" in name
      const parent = path.parent;
      if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
        if (parent.id.name.toLowerCase().includes('reset')) {
          checkForMultipleSetterCalls(path, stateSetters, (count) => {
            if (count >= 3) hasResetPattern = true;
          });
        }
      }
    },
  });

  return hasResetPattern;
}

function checkForMultipleSetterCalls(
  functionPath: NodePath,
  stateSetters: Set<string>,
  callback: (count: number) => void
): void {
  let setterCallCount = 0;

  functionPath.traverse({
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee) && stateSetters.has(path.node.callee.name)) {
        setterCallCount++;
      }
    },
  });

  callback(setterCallCount);
}

function getSuggestion(
  totalStates: number,
  fieldNames: string[],
  validationNames: string[],
  hasManualReset: boolean
): string {
  if (totalStates >= 12) {
    return `For complex forms with ${totalStates} states, consider React Hook Form for better performance and developer experience: const { register, handleSubmit, formState: { errors } } = useForm();`;
  }

  if (totalStates >= 10) {
    return `Consider React Hook Form or TanStack Form for better form management: const form = useForm({ defaultValues: { ${fieldNames.slice(0, 3).join(': "", ')}${fieldNames.length > 3 ? ': "", ...' : ': ""'} } });`;
  }

  if (validationNames.length >= 3 || hasManualReset) {
    return `For forms with complex validation${hasManualReset ? ' and reset logic' : ''}, consider React Hook Form or group related state: const [formData, setFormData] = useState({ ${fieldNames.slice(0, 3).join(': "", ')}${fieldNames.length > 3 ? ': "", ...' : ': ""'} });`;
  }

  return `Consider grouping related form fields or using useReducer for better state management: const [formData, setFormData] = useState({ ${fieldNames.slice(0, 3).join(': "", ')}${fieldNames.length > 3 ? ': "", ...' : ': ""'} });`;
}
