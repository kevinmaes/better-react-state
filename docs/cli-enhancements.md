# CLI Enhancement Proposal

## Current State

We're using:

- `commander` (v12) - For CLI argument parsing
- `chalk` (v5) - For colored output

## Proposed Enhancements

### 1. @clack/prompts

**Benefits:**

- Beautiful, interactive prompts
- Progress spinners and bars
- Better user experience for interactive mode

**Use Cases:**

```javascript
// Interactive mode for selecting files
const files = await multiselect({
  message: 'Select files to analyze',
  options: discoveredFiles,
});

// Confirm before applying fixes
const shouldFix = await confirm({
  message: 'Apply fixes to 23 issues?',
});

// Show progress
const s = spinner();
s.start('Analyzing files...');
// ... do work
s.stop('Analysis complete!');
```

### 2. Upgrade commander to v14

**Benefits:**

- Better TypeScript support
- Improved error messages
- New features like `.addHelpText()`

### 3. kleur vs chalk

**Considerations:**

- `kleur` is 5x smaller and faster than chalk
- We already use chalk, but kleur might be better for performance
- Both have similar APIs

## Recommended Approach

### Phase 1: Enhanced Non-Interactive Mode (Current Priority)

Keep current setup but improve output:

```typescript
// Better formatted output with chalk
console.log(chalk.bold('🔍 Analyzing React state patterns...'));
console.log(chalk.dim(`Found ${files.length} files to analyze`));

// Progress indication
process.stdout.write(chalk.gray(`Analyzing ${filename}...`));
```

### Phase 2: Add Interactive Mode (Future)

Add @clack/prompts for a new `--interactive` flag:

```bash
# Interactive mode
fix-react-state --interactive

# Would show:
┌  fix-react-state
│
◆  What would you like to analyze?
│  ● Current directory (.)
│  ○ Specific file
│  ○ Custom pattern
│
◆  Select rules to apply:
│  ◻ Group related state
│  ◻ Avoid state contradictions
│  ◻ Avoid redundant state
│
◆  Found 30 issues. What would you like to do?
│  ● View detailed report
│  ○ Save report
│  ○ Apply fixes (where possible)
└
```

### Phase 3: Fix Application UI

When we implement auto-fix:

```typescript
const fixes = await checkbox({
  message: 'Select fixes to apply:',
  options: fixableIssues.map((issue) => ({
    value: issue.id,
    label: `${issue.file}: ${issue.message}`,
    hint: issue.suggestion,
  })),
});
```

## Implementation Plan

1. **Now**: Keep current setup, it works well
2. **When adding --fix**: Add @clack/prompts for interactive fix selection
3. **Consider**: Switching chalk → kleur if bundle size becomes important

## Current CLI is Already Good!

- Clean, colorful output ✓
- Multiple format options ✓
- Standard CLI patterns ✓
- Fast and efficient ✓

The current CLI is actually quite nice. Interactive features would be "nice to have" but not essential for the tool's core purpose.
