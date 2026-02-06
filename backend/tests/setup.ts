import { vi } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:';

// Global test setup
export async function setup() {
  // Any global setup before tests run
  console.log('🧪 Test environment initialized');
}

export async function teardown() {
  // Cleanup after all tests
  console.log('✅ Tests complete');
}
