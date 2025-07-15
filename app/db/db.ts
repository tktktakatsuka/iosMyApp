import * as SQLite from 'expo-sqlite';

async function setupDatabase() {
  const db = await SQLite.openDatabaseAsync('databaseName');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS test (
      id INTEGER PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      intValue INTEGER
    );
  `);

  await db.runAsync('INSERT INTO test (value, intValue) VALUES (?, ?)', 'test1', 123);
  await db.runAsync('INSERT INTO test (value, intValue) VALUES (?, ?)', 'test2', 456);

  const allRows = await db.getAllAsync('SELECT * FROM test');
  console.log(allRows);
}

setupDatabase();
