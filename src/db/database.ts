import initSqlJs, { type Database } from "sql.js"

let db: Database | null = null

const DB_STORAGE_KEY = "enterprise-records-db"
const DB_VERSION_KEY = "enterprise-records-version"
const DB_BACKUP_PREFIX = "enterprise-records-db-backup-"

const isElectron = !!window.electronDB

/** 应用启动时检测版本变化，自动备份旧数据库 */
async function backupIfVersionChanged(): Promise<void> {
  const currentVersion = `${__BUILD_TIME__} (${__GIT_HASH__})`
  const savedVersion = localStorage.getItem(DB_VERSION_KEY)

  if (savedVersion && savedVersion !== currentVersion) {
    if (isElectron) {
      await window.electronDB!.backupDatabase(savedVersion)
    } else {
      const savedDb = localStorage.getItem(DB_STORAGE_KEY)
      if (savedDb) {
        localStorage.setItem(`${DB_BACKUP_PREFIX}${savedVersion}`, savedDb)
      }
    }
  }

  localStorage.setItem(DB_VERSION_KEY, currentVersion)
}

export async function getDatabase(): Promise<Database> {
  if (db) return db

  await backupIfVersionChanged()

  const SQL = await initSqlJs({
    locateFile: () => window.location.protocol === 'file:' ? './sql-wasm.wasm' : '/sql-wasm.wasm',
  })

  if (isElectron) {
    const fileData = await window.electronDB!.readDatabase()
    if (fileData) {
      db = new SQL.Database(new Uint8Array(fileData))
    } else {
      // 首次运行：检查 localStorage 是否有旧数据需要迁移
      const savedDb = localStorage.getItem(DB_STORAGE_KEY)
      if (savedDb) {
        const buf = Uint8Array.from(atob(savedDb), (c) => c.charCodeAt(0))
        db = new SQL.Database(buf)
      } else {
        db = new SQL.Database()
      }
    }
  } else {
    const savedDb = localStorage.getItem(DB_STORAGE_KEY)
    if (savedDb) {
      const buf = Uint8Array.from(atob(savedDb), (c) => c.charCodeAt(0))
      db = new SQL.Database(buf)
    } else {
      db = new SQL.Database()
    }
  }

  initTables()

  // Electron 模式下：持久化到文件，并清理 localStorage 中的旧数据
  if (isElectron) {
    const data = db.export()
    await window.electronDB!.writeDatabase(data)

    if (localStorage.getItem(DB_STORAGE_KEY)) {
      localStorage.removeItem(DB_STORAGE_KEY)
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && key.startsWith(DB_BACKUP_PREFIX)) {
          localStorage.removeItem(key)
        }
      }
    }
  }

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

  // ── 业务数据表（规范化）──────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS screening (
    id TEXT PRIMARY KEY,
    credit_code TEXT,
    company_name TEXT,
    industry TEXT,
    township TEXT,
    is_above_scale INTEGER DEFAULT 0,
    is_operating INTEGER DEFAULT 0,
    in_town_level INTEGER DEFAULT 0,
    in_city_level INTEGER DEFAULT 0,
    in_other INTEGER DEFAULT 0,
    report_date TEXT,
    report_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS screening_tax (
    screening_id TEXT,
    year INTEGER,
    revenue REAL, profit REAL, tax_payable REAL, assets REAL, liabilities REAL, debt_ratio REAL,
    PRIMARY KEY (screening_id, year)
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS screening_metric (
    screening_id TEXT,
    kind TEXT,
    year INTEGER,
    value REAL,
    PRIMARY KEY (screening_id, kind, year)
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS report_source (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    screening_id TEXT,
    seq INTEGER,
    department TEXT, warning_reason TEXT, issue_date TEXT, amount REAL, other TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS level_extra (
    level TEXT,
    credit_code TEXT,
    business_status TEXT, asset_status TEXT, debt_status TEXT, staff_status TEXT,
    other_feedback TEXT, coordination TEXT,
    PRIMARY KEY (level, credit_code)
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS level_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT, credit_code TEXT, seq INTEGER,
    date TEXT, content TEXT, instruction TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS biz_group (
    id TEXT PRIMARY KEY,
    name TEXT,
    sort_order INTEGER DEFAULT 0
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS biz_group_member (
    group_id TEXT, credit_code TEXT, seq INTEGER,
    PRIMARY KEY (group_id, credit_code)
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS level_event (
    id TEXT PRIMARY KEY,
    record_id TEXT,
    type TEXT,
    date TEXT,
    note TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS reminder (
    id TEXT PRIMARY KEY,
    record_id TEXT,
    description TEXT,
    date TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
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

  if (isElectron) {
    window.electronDB!.writeDatabase(data).catch(err => {
      console.error('Failed to save database to disk:', err)
    })
  } else {
    const base64 = btoa(String.fromCharCode(...data))
    localStorage.setItem(DB_STORAGE_KEY, base64)
  }
}

/** 导出数据库为 Uint8Array */
export function exportDatabase(): Uint8Array {
  if (!db) throw new Error("Database not initialized")
  return db.export()
}

/** 导入 sqlite 文件覆盖当前数据库 */
export async function importDatabase(data: Uint8Array): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: () => window.location.protocol === 'file:' ? './sql-wasm.wasm' : '/sql-wasm.wasm',
  })
  if (db) db.close()
  db = new SQL.Database(data)
  saveDatabase()
}

export const SCREENING_STORAGE_KEY = "enterprise-records-screening"
export const SCREENING_DETAIL_KEY = "enterprise-records-screening-detail"

/** 删除所有初筛 / 级别 / 集团 / 时间轴 / 提醒业务数据（字典保留） */
export function resetScreeningData(): void {
  runWrite(d => {
    for (const t of [
      'screening', 'screening_tax', 'screening_metric', 'report_source',
      'level_extra', 'level_progress', 'biz_group', 'biz_group_member',
      'level_event', 'reminder',
    ]) {
      d.run(`DELETE FROM ${t}`)
    }
  })
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

/** 查询并返回行对象数组（列名 → 值） */
export function queryRows(sql: string, params?: unknown[]): Record<string, unknown>[] {
  if (!db) throw new Error("Database not initialized")
  const stmt = db.prepare(sql)
  try {
    if (params && params.length) stmt.bind(params as never[])
    const out: Record<string, unknown>[] = []
    while (stmt.step()) out.push(stmt.getAsObject())
    return out
  } finally {
    stmt.free()
  }
}

/** 在一个事务中执行多条写操作，结束后仅持久化一次 */
export function runWrite(fn: (db: Database) => void): void {
  if (!db) throw new Error("Database not initialized")
  db.run("BEGIN")
  try {
    fn(db)
    db.run("COMMIT")
  } catch (e) {
    db.run("ROLLBACK")
    throw e
  }
  saveDatabase()
}
