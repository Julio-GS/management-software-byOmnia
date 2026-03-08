const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs-extra');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['electron/main.ts', 'electron/preload.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outdir: 'dist/electron',
  external: [
    'electron',
    'better-sqlite3',
    '@mapbox/node-pre-gyp',
    'mock-aws-s3',
    'aws-sdk',
    'nock',
  ],
  sourcemap: true,
  format: 'cjs',
  logLevel: 'info',
};

// Plugin to copy SQL migration files
const copyMigrationsPlugin = {
  name: 'copy-migrations',
  setup(build) {
    build.onEnd(async () => {
      const migrationsSource = path.join(__dirname, '../../packages/local-db/src/migrations');
      const migrationsTarget = path.join(__dirname, 'dist/electron/migrations');
      
      try {
        // Copy all .sql files
        await fs.ensureDir(migrationsTarget);
        const files = await fs.readdir(migrationsSource);
        const sqlFiles = files.filter(f => f.endsWith('.sql'));
        
        for (const file of sqlFiles) {
          await fs.copy(
            path.join(migrationsSource, file),
            path.join(migrationsTarget, file)
          );
        }
        
        if (sqlFiles.length > 0) {
          console.log(`✓ Copied ${sqlFiles.length} migration files to dist`);
        }
      } catch (error) {
        console.error('Failed to copy migrations:', error);
      }
    });
  },
};

buildOptions.plugins = [copyMigrationsPlugin];

async function build() {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
  }
}

build().catch(() => process.exit(1));
