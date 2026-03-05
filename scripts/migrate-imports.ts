#!/usr/bin/env node
/**
 * Import Migration Script
 * Migrates imports from flat component structure to feature-based architecture
 * 
 * Usage:
 *   ts-node scripts/migrate-imports.ts [--dry-run]
 * 
 * Options:
 *   --dry-run: Preview changes without modifying files
 */

import * as fs from 'fs';
import * as path from 'path';

// Import mappings from old flat structure to new feature-based structure
const IMPORT_MAPPINGS: Record<string, string> = {
  '@/components/dashboard-view': '@/features/dashboard/components/dashboard-view',
  '@/components/pos-view': '@/features/pos/components/pos-view',
  '@/components/inventory-view': '@/features/inventory/components/inventory-view',
  '@/components/promociones-view': '@/features/promotions/components/promociones-view',
  '@/components/reportes-view': '@/features/reports/components/reportes-view',
  '@/components/ajustes-view': '@/features/settings/components/ajustes-view',
  '@/components/app-sidebar': '@/shared/components/layout/app-sidebar',
  '@/components/daily-sales-chart': '@/features/dashboard/components/daily-sales-chart',
  '@/components/theme-provider': '@/shared/components/theme-provider',
};

interface ChangeLog {
  file: string;
  changes: Array<{
    line: number;
    old: string;
    new: string;
  }>;
}

const changeLogs: ChangeLog[] = [];

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
 * Migrate imports in a single file
 */
function migrateFileImports(filePath: string, dryRun: boolean): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;
  const fileChanges: ChangeLog['changes'] = [];

  const newLines = lines.map((line, index) => {
    let newLine = line;
    
    // Check each import mapping
    for (const [oldImport, newImport] of Object.entries(IMPORT_MAPPINGS)) {
      // Match both default and named imports
      // Examples: 
      //   import { Component } from "@/components/dashboard-view"
      //   import Component from '@/components/dashboard-view'
      const importRegex = new RegExp(
        `from\\s+["']${oldImport.replace(/\//g, '\\/')}["']`,
        'g'
      );
      
      if (importRegex.test(line)) {
        newLine = line.replace(importRegex, `from "${newImport}"`);
        modified = true;
        
        fileChanges.push({
          line: index + 1,
          old: line.trim(),
          new: newLine.trim(),
        });
      }
    }
    
    return newLine;
  });

  if (modified) {
    changeLogs.push({
      file: path.relative(process.cwd(), filePath),
      changes: fileChanges,
    });

    if (!dryRun) {
      fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
    }
  }

  return modified;
}

/**
 * Main migration function
 */
function migrate(targetDir: string, dryRun: boolean) {
  console.log('🔍 Import Migration Tool\n');
  console.log(`Target directory: ${targetDir}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (preview only)' : 'LIVE (will modify files)'}\n`);

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Error: Directory "${targetDir}" does not exist`);
    process.exit(1);
  }

  const files = findTsFiles(targetDir);
  console.log(`📁 Found ${files.length} TypeScript/TSX files\n`);

  let modifiedCount = 0;
  
  for (const file of files) {
    if (migrateFileImports(file, dryRun)) {
      modifiedCount++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Migration Summary');
  console.log('='.repeat(80) + '\n');

  if (changeLogs.length === 0) {
    console.log('✅ No imports needed to be migrated!');
  } else {
    console.log(`📝 Modified ${modifiedCount} file(s):\n`);
    
    for (const log of changeLogs) {
      console.log(`\n📄 ${log.file}`);
      for (const change of log.changes) {
        console.log(`   Line ${change.line}:`);
        console.log(`   - ${change.old}`);
        console.log(`   + ${change.new}`);
      }
    }

    if (dryRun) {
      console.log('\n⚠️  DRY RUN: No files were actually modified.');
      console.log('   Run without --dry-run to apply changes.');
    } else {
      console.log('\n✅ Migration complete! All imports have been updated.');
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Generate change log file
  if (changeLogs.length > 0) {
    const logFileName = `migration-log-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
    const logPath = path.join(process.cwd(), 'scripts', logFileName);
    fs.writeFileSync(logPath, JSON.stringify(changeLogs, null, 2));
    console.log(`📋 Change log saved to: scripts/${logFileName}\n`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Target directory is apps/web/app
const targetDir = path.join(process.cwd(), 'apps', 'web', 'app');

migrate(targetDir, dryRun);
