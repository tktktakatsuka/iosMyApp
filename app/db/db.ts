import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export type ProfitItem = {
  amount: number;
  categoryId?: string;
  type: 'income' | 'expense';
};

export const initDB = async () => {
  if (db) return; // 既に初期化済みならスキップ
  db = await SQLite.openDatabaseAsync('profit.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS profitData (
      date TEXT PRIMARY KEY NOT NULL,
      amount INTEGER NOT NULL,
      categoryId TEXT,
      type TEXT
    );
  `);
};

export const getAllProfitItems = async (): Promise<Record<string, ProfitItem>> => {
  if (!db) throw new Error('DBが初期化されていません。initDB を先に呼んでください。');
  const rows = await db.getAllAsync<{
    date: string;
    amount: number;
    categoryId?: string;
    type: 'income' | 'expense';
  }>('SELECT * FROM profitData');

  const result: Record<string, ProfitItem> = {};
  for (const row of rows) {
    result[row.date] = {
      amount: row.amount,
      categoryId: row.categoryId ?? undefined,
      type: row.type,
    };
  }
  return result;
};

export const saveProfitItem = async (date: string, item: ProfitItem): Promise<void> => {
  if (!db) throw new Error('DBが初期化されていません。initDB を先に呼んでください。');
  await db.runAsync(
    `INSERT OR REPLACE INTO profitData (date, amount, categoryId, type) VALUES (?, ?, ?, ?)`,
    [date, item.amount, item.categoryId ?? null, item.type]
  );
};
