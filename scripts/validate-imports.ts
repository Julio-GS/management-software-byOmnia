#!/usr/bin/env node
/**
 * Import Validation Script
 * Validates that no old import patterns remain after migration
 * 
 * Usage:
 *   ts-node scripts/validate-imports.ts
 * 
 * Exit codes:
 *   0: All imports are valid
 *   1: Found old import patterns
 */

import * as fs from 'fs';
import * as path from 'path';

// Patterns that should no longer exist (except for @/components/ui/* which is now @/shared/components/ui/*)
const FORBIDDEN_PATTERNS = [
  '@/components/dashboard-view',
  '@/components/pos-view',
  '@/components/inventory-view',
  '@/components/promociones-view',
  '@/components/reportes-view',
  '@/components/ajustes-view',
  '@/components/app-sidebar',
  '@/components/daily-sales-chart',
  '@/components/theme-provider',
];

interface ValidationIssue {
  file: string;
  line: number;
  content: string;
  pattern: string;
}

const issues: ValidationIssue[] = [];

/**
 * Recursively find all TypeScript/TSX files in a directory
 */
function findTsFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and .next directories
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        files.push(...findTsFiles(fullPath));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Validate imports in a single file
 */
function validateFileImports(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Check if line contains an import statement
    if (line.includes('import') && line.includes('from')) {
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (line.includes(pattern)) {
          issues.push({
            file: path.relative(process.cwd(), filePath),
            line: index + 1,
            content: line.trim(),
            pattern,
          });
        }
      }
    }
  });
}

/**
 * Main validation function
 */
function validate(targetDir: string) {
  console.log('🔍 Import Validation Tool\n');
  console.log(`Target directory: ${targetDir}\n`);

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Error: Directory "${targetDir}" does not exist`);
    process.exit(1);
  }

  const files = findTsFiles(targetDir);
  console.log(`📁 Scanning ${files.length} TypeScript/TSX files...\n`);

  for (const file of files) {
    validateFileImports(file);
  }

  console.log('='.repeat(80));
  console.log('📊 Validation Results');
  console.log('='.repeat(80) + '\n');

  if (issues.length === 0) {
    console.log('✅ SUCCESS: All imports are valid!');
    console.log('   No old import patterns detected.\n');
    process.exit(0);
  } else {
    console.log(`❌ FAILURE: Found ${issues.length} old import pattern(s)\n`);
    
    // Group issues by file
    const issuesByFile = new Map<string, ValidationIssue[]>();
    for (const issue of issues) {
      if (!issuesByFile.has(issue.file)) {
        issuesByFile.set(issue.file, []);
      }
      issuesByFile.get(issue.file)!.push(issue);
    }

    for (const [file, fileIssues] of issuesByFile) {
      console.log(`\n📄 ${file}`);
      for (const issue of fileIssues) {
        console.log(`   Line ${issue.line}: ${issue.content}`);
        console.log(`   ⚠️  Contains forbidden pattern: ${issue.pattern}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 Tip: Run "pnpm exec ts-node scripts/migrate-imports.ts" to fix these issues.\n');
    
    process.exit(1);
  }
}

// Target directory is apps/web/app
const targetDir = path.join(process.cwd(), 'apps', 'web', 'app');

validate(targetDir);
