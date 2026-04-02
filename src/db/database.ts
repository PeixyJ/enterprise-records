import initSqlJs, { type Database } from "sql.js"

let db: Database | null = null

const DB_STORAGE_KEY = "enterprise-records-db"

export async function getDatabase(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs({
    locateFile: () => `/sql-wasm.wasm`,
  })

  // Try to load from localStorage
  const savedDb = localStorage.getItem(DB_STORAGE_KEY)
  if (savedDb) {
    const buf = Uint8Array.from(atob(savedDb), (c) => c.charCodeAt(0))
    db = new SQL.Database(buf)
  } else {
    db = new SQL.Database()
  }

  initTables()

  return db
}

function initTables(): void {
  if (!db) return

  db.run(`CREATE TABLE IF NOT EXISTS dict_township (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS dict_industry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0
  )`)

  // Seed default townships if empty
  const townCount = db.exec("SELECT COUNT(*) FROM dict_township")
  if (townCount.length === 0 || townCount[0].values[0][0] === 0) {
    const townships = [
      '开发区（高桥街道）', '梧桐街道', '凤鸣街道', '濮院镇',
      '屠甸镇', '崇福镇', '洲泉镇', '大麻镇',
      '河山镇', '乌镇镇', '石门镇',
    ]
    townships.forEach((name, i) => {
      db!.run("INSERT OR IGNORE INTO dict_township (name, sort_order) VALUES (?, ?)", [name, i])
    })
  }

  // Seed default industries if empty
  const indCount = db.exec("SELECT COUNT(*) FROM dict_industry")
  if (indCount.length === 0 || indCount[0].values[0][0] === 0) {
    const industries = ['农业', '工业', '服务业', '房地产建筑业']
    industries.forEach((name, i) => {
      db!.run("INSERT OR IGNORE INTO dict_industry (name, sort_order) VALUES (?, ?)", [name, i])
    })
  }

  saveDatabase()
}

export function saveDatabase(): void {
  if (!db) return
  const data = db.export()
  const base64 = btoa(String.fromCharCode(...data))
  localStorage.setItem(DB_STORAGE_KEY, base64)
}

/** 导出数据库为 Uint8Array */
export function exportDatabase(): Uint8Array {
  if (!db) throw new Error("Database not initialized")
  return db.export()
}

/** 导入 sqlite 文件覆盖当前数据库 */
export async function importDatabase(data: Uint8Array): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: () => `/sql-wasm.wasm`,
  })
  if (db) db.close()
  db = new SQL.Database(data)
  saveDatabase()
}

export const SCREENING_STORAGE_KEY = "enterprise-records-screening"
export const SCREENING_DETAIL_KEY = "enterprise-records-screening-detail"

/** 删除初筛表数据并重置（存空数组标记已初始化） */
export function resetScreeningData(): void {
  localStorage.setItem(SCREENING_STORAGE_KEY, "[]")
  localStorage.removeItem(SCREENING_DETAIL_KEY)
}

export function execSQL(sql: string, params?: unknown[]): unknown[] {
  if (!db) throw new Error("Database not initialized")
  const results = db.exec(sql, params as never[])
  return results
}

export function runSQL(sql: string, params?: unknown[]): void {
  if (!db) throw new Error("Database not initialized")
  db.run(sql, params as never[])
  saveDatabase()
}
