module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/main.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 10000,
  coverageThreshold: {
    './src/sales/entities/**/*.ts': {
      statements: 95,
      branches: 85,
      functions: 95,
      lines: 95,
    },
    './src/sales/repositories/**/*.ts': {
      statements: 90,
      branches: 75,
      functions: 90,
      lines: 90,
    },
    './src/shared/events/sale-*.ts': {
      statements: 95,
      branches: 100,
      functions: 95,
      lines: 95,
    },
    './src/shared/exceptions/**/*.ts': {
      statements: 95,
      branches: 100,
      functions: 95,
      lines: 95,
    },
  },
};
