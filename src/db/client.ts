import * as SQLite from 'expo-sqlite';
import type { Bill, Category, CategorySpendingRow } from '../types';

let dbInstance: SQLite.SQLiteDatabase | null = null;

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  category_id INTEGER NOT NULL,
  amount_paise INTEGER NOT NULL,
  image_uri TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_bills_category ON bills (category_id);
`;

async function migrateCategoriesTable(db: SQLite.SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(categories)`);
  const hasIsDefault = cols.some((c) => c.name === 'is_default');
  if (!hasIsDefault) {
    await db.execAsync(
      `ALTER TABLE categories ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0`
    );
  }
}

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  const db = await SQLite.openDatabaseAsync('bills_sorting.db');
  await db.execAsync(SCHEMA);
  await migrateCategoriesTable(db);
  dbInstance = db;
  return db;
}

export async function getCategories(): Promise<Category[]> {
  const db = await openDatabase();
  return db.getAllAsync<Category>(
    `SELECT id, name, sort_order, created_at, is_default FROM categories
     ORDER BY is_default DESC, sort_order ASC, name ASC`
  );
}

export async function insertCategory(
  name: string,
  opts?: { makeDefault?: boolean }
): Promise<number> {
  const db = await openDatabase();
  const makeDefault = opts?.makeDefault === true;
  if (makeDefault) {
    await db.runAsync(`UPDATE categories SET is_default = 0`);
  }
  const created = new Date().toISOString();
  const isDef = makeDefault ? 1 : 0;
  const result = await db.runAsync(
    `INSERT INTO categories (name, sort_order, created_at, is_default) VALUES (?, ?, ?, ?)`,
    [name.trim(), Date.now(), created, isDef]
  );
  return result.lastInsertRowId;
}

export async function updateCategory(
  id: number,
  name: string,
  opts?: { makeDefault?: boolean }
): Promise<void> {
  const db = await openDatabase();
  const want = opts?.makeDefault;
  if (want === true) {
    await db.runAsync(`UPDATE categories SET is_default = 0`);
    await db.runAsync(`UPDATE categories SET name = ?, is_default = 1 WHERE id = ?`, [
      name.trim(),
      id,
    ]);
  } else if (want === false) {
    await db.runAsync(`UPDATE categories SET name = ?, is_default = 0 WHERE id = ?`, [
      name.trim(),
      id,
    ]);
  } else {
    await db.runAsync(`UPDATE categories SET name = ? WHERE id = ?`, [name.trim(), id]);
  }
}

export async function countBillsForCategory(categoryId: number): Promise<number> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM bills WHERE category_id = ?`,
    [categoryId]
  );
  return row?.c ?? 0;
}

export async function deleteCategory(
  id: number
): Promise<{ ok: true } | { ok: false; reason: 'has_bills' }> {
  const n = await countBillsForCategory(id);
  if (n > 0) return { ok: false, reason: 'has_bills' };
  const db = await openDatabase();
  await db.runAsync(`DELETE FROM categories WHERE id = ?`, [id]);
  return { ok: true };
}

export async function updateBillCategory(billId: number, categoryId: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(`UPDATE bills SET category_id = ? WHERE id = ?`, [categoryId, billId]);
}

export async function insertBill(
  categoryId: number,
  amountPaise: number,
  imageUri: string
): Promise<number> {
  const db = await openDatabase();
  const created = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO bills (category_id, amount_paise, image_uri, created_at) VALUES (?, ?, ?, ?)`,
    [categoryId, amountPaise, imageUri, created]
  );
  return result.lastInsertRowId;
}

export async function deleteBill(id: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(`DELETE FROM bills WHERE id = ?`, [id]);
}

export async function getBillsByCategory(
  categoryId: number,
  range?: { startIso: string; endIso: string }
): Promise<Bill[]> {
  const db = await openDatabase();
  if (range) {
    return db.getAllAsync<Bill>(
      `SELECT id, category_id, amount_paise, image_uri, created_at FROM bills
       WHERE category_id = ? AND created_at >= ? AND created_at <= ?
       ORDER BY created_at DESC`,
      [categoryId, range.startIso, range.endIso]
    );
  }
  return db.getAllAsync<Bill>(
    `SELECT id, category_id, amount_paise, image_uri, created_at FROM bills WHERE category_id = ? ORDER BY created_at DESC`,
    [categoryId]
  );
}

export async function getTotalSpendingPaise(): Promise<number> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ t: number | null }>(
    `SELECT COALESCE(SUM(amount_paise), 0) as t FROM bills`
  );
  return row?.t ?? 0;
}

export async function getTotalSpendingPaiseInRange(startIso: string, endIso: string): Promise<number> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ t: number | null }>(
    `SELECT COALESCE(SUM(amount_paise), 0) as t FROM bills WHERE created_at >= ? AND created_at <= ?`,
    [startIso, endIso]
  );
  return row?.t ?? 0;
}

export async function getSpendingByCategory(): Promise<CategorySpendingRow[]> {
  const db = await openDatabase();
  return db.getAllAsync<CategorySpendingRow>(
    `SELECT c.id AS category_id, c.name, COALESCE(SUM(b.amount_paise), 0) AS total_paise, COUNT(b.id) AS bill_count
     FROM categories c
     LEFT JOIN bills b ON b.category_id = c.id
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.name ASC`
  );
}

export async function getSpendingByCategoryInRange(
  startIso: string,
  endIso: string
): Promise<CategorySpendingRow[]> {
  const db = await openDatabase();
  return db.getAllAsync<CategorySpendingRow>(
    `SELECT c.id AS category_id, c.name, COALESCE(SUM(b.amount_paise), 0) AS total_paise, COUNT(b.id) AS bill_count
     FROM categories c
     LEFT JOIN bills b ON b.category_id = c.id
       AND b.created_at >= ? AND b.created_at <= ?
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.name ASC`,
    [startIso, endIso]
  );
}
