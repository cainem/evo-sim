module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Changed back from 'node'
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverage: true,
  verbose: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ]
};