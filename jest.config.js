module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
};
