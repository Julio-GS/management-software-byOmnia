module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // ==========================================
    // ARCHITECTURAL RULES - Omnia Standards
    // ==========================================
    
    // 1. Prevent direct SyncGateway injection in domain services
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Identifier[name="SyncGateway"]',
        message: 'Do not inject SyncGateway directly. Use EventBus and domain events instead. See docs/ARCHITECTURE.md for migration guide.',
      },
    ],
    
    // 2. Enforce max file size (300 lines)
    'max-lines': [
      'error',
      {
        max: 300,
        skipBlankLines: true,
        skipComments: true,
      },
    ],
    
    // 3. Enforce naming conventions
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: false,
        },
      },
      {
        selector: 'typeAlias',
        format: ['PascalCase'],
      },
      {
        selector: 'class',
        format: ['PascalCase'],
      },
      {
        selector: 'enum',
        format: ['PascalCase'],
      },
    ],
    
    // 4. Prevent Prisma client direct usage outside repositories
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@prisma/client'],
            message: 'Import Prisma only in repository files (*.repository.ts). Use repositories for data access.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // Allow Prisma imports in repository files
      files: ['**/*.repository.ts', '**/prisma.service.ts', '**/prisma.module.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
    {
      // Allow SyncGateway in sync module (gateway, module, handlers, tests)
      files: [
        '**/sync/sync.gateway.ts',
        '**/sync/sync.module.ts',
        '**/sync/handlers/**/*.ts',
        '**/sync/**/*.spec.ts',
      ],
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
    {
      // Allow any types in test files
      files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'max-lines': 'off', // Test files can be longer
      },
    },
  ],
};
