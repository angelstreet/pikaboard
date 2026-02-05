import { beforeAll, afterAll, beforeEach } from 'vitest';

// Set test environment BEFORE importing db
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.PIKABOARD_TOKEN = 'test-token';

// Now import db
import { db, initDatabase } from '../src/db/index.js';

beforeAll(() => {
  initDatabase();
});

beforeEach(() => {
  // Clear tables before each test
  db.exec('DELETE FROM tasks');
  db.exec('DELETE FROM activity');
  // Reset auto-increment (sqlite_sequence may not exist in fresh memory db)
  try {
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('tasks', 'activity')");
  } catch {
    // sqlite_sequence only exists after first autoincrement insert
  }
});

afterAll(() => {
  db.close();
});
