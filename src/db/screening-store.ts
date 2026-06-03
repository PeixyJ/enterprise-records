import type { ScreeningRecord } from '@/pages/screening'
import { queryRows, runWrite, runSQL } from './database'

// ── 明细类型（税务 / 人社 / 电力 / 水务 / 金融办 / 上报记录）──
export interface ReportSourceItem {
  department?: string
  warningReason?: string
  issueDate?: string
  amount?: number
  other?: string
}
export interface TaxRow {
  year: number
  revenue?: number; profit?: number; taxPayable?: number; assets?: number; liabilities?: number; debtRatio?: number
}
export interface MetricRow { year: number; value?: number }
export interface StoredDetail {
  tax?: TaxRow[]
  social?: MetricRow[]
  power?: MetricRow[]
  water?: MetricRow[]
  loan?: MetricRow[]
  reportSources?: ReportSourceItem[]
}

const numOrU = (v: unknown): number | undefined => (v == null ? undefined : (v as number))
const strOrU = (v: unknown): string | undefined => (v == null || v === '' ? undefined : (v as string))

// ── 初筛主数据 ──────────────────────────────────────

export function loadScreening(): ScreeningRecord[] {
  const rows = queryRows('SELECT * FROM screening ORDER BY sort_order, rowid')
  return rows.map(r => ({
    id: r.id as string,
    creditCode: (r.credit_code as string) ?? '',
    companyName: (r.company_name as string) ?? '',
    industry: (r.industry as string) ?? '',
    township: (r.township as string) ?? '',
    isAboveScale: !!r.is_above_scale,
    isOperating: !!r.is_operating,
    inTownLevel: !!r.in_town_level,
    inCityLevel: !!r.in_city_level,
    inOther: !!r.in_other,
    reportDate: (r.report_date as string) ?? '',
    reportCount: (r.report_count as number) ?? 0,
  }))
}

export function saveScreening(records: ScreeningRecord[]): void {
  runWrite(d => {
    d.run('DELETE FROM screening')
    records.forEach((r, i) => {
      d.run(
        `INSERT INTO screening (id, credit_code, company_name, industry, township, is_above_scale, is_operating, in_town_level, in_city_level, in_other, report_date, report_count, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [r.id, r.creditCode, r.companyName, r.industry, r.township,
          r.isAboveScale ? 1 : 0, r.isOperating ? 1 : 0, r.inTownLevel ? 1 : 0, r.inCityLevel ? 1 : 0, r.inOther ? 1 : 0,
          r.reportDate, r.reportCount, i] as never[],
      )
    })
  })
}

/** 仅更新某企业的「列入镇级 / 列入市级」状态（供时间轴回写使用，避免整表重写） */
export function updateScreeningLevels(id: string, patch: { inTownLevel?: boolean; inCityLevel?: boolean }): void {
  const sets: string[] = []
  const vals: unknown[] = []
  if (patch.inTownLevel !== undefined) { sets.push('in_town_level = ?'); vals.push(patch.inTownLevel ? 1 : 0) }
  if (patch.inCityLevel !== undefined) { sets.push('in_city_level = ?'); vals.push(patch.inCityLevel ? 1 : 0) }
  if (sets.length === 0) return
  vals.push(id)
  runSQL(`UPDATE screening SET ${sets.join(', ')} WHERE id = ?`, vals)
}

// ── 明细数据 ────────────────────────────────────────

function rowsToDetailMap(
  tax: Record<string, unknown>[],
  metric: Record<string, unknown>[],
  sources: Record<string, unknown>[],
): Record<string, StoredDetail> {
  const map: Record<string, StoredDetail> = {}
  const ensure = (id: string) => (map[id] ??= {})
  for (const t of tax) {
    const d = ensure(t.screening_id as string)
    ;(d.tax ??= []).push({
      year: t.year as number,
      revenue: numOrU(t.revenue), profit: numOrU(t.profit), taxPayable: numOrU(t.tax_payable),
      assets: numOrU(t.assets), liabilities: numOrU(t.liabilities), debtRatio: numOrU(t.debt_ratio),
    })
  }
  for (const m of metric) {
    const d = ensure(m.screening_id as string)
    const kind = m.kind as 'social' | 'power' | 'water' | 'loan'
    ;(d[kind] ??= []).push({ year: m.year as number, value: numOrU(m.value) })
  }
  for (const s of sources) {
    const d = ensure(s.screening_id as string)
    ;(d.reportSources ??= []).push({
      department: strOrU(s.department), warningReason: strOrU(s.warning_reason),
      issueDate: strOrU(s.issue_date), amount: numOrU(s.amount), other: strOrU(s.other),
    })
  }
  return map
}

export function loadDetail(id: string): StoredDetail | null {
  const tax = queryRows('SELECT * FROM screening_tax WHERE screening_id = ? ORDER BY year', [id])
  const metric = queryRows('SELECT * FROM screening_metric WHERE screening_id = ? ORDER BY kind, year', [id])
  const sources = queryRows('SELECT * FROM report_source WHERE screening_id = ? ORDER BY seq, id', [id])
  if (!tax.length && !metric.length && !sources.length) return null
  return rowsToDetailMap(tax, metric, sources)[id] ?? null
}

export function loadAllDetail(): Record<string, StoredDetail> {
  const tax = queryRows('SELECT * FROM screening_tax ORDER BY year')
  const metric = queryRows('SELECT * FROM screening_metric ORDER BY kind, year')
  const sources = queryRows('SELECT * FROM report_source ORDER BY seq, id')
  return rowsToDetailMap(tax, metric, sources)
}

function insertDetail(d: import('sql.js').Database, id: string, detail: StoredDetail) {
  for (const t of detail.tax ?? []) {
    d.run('INSERT OR REPLACE INTO screening_tax (screening_id, year, revenue, profit, tax_payable, assets, liabilities, debt_ratio) VALUES (?,?,?,?,?,?,?,?)',
      [id, t.year, t.revenue ?? null, t.profit ?? null, t.taxPayable ?? null, t.assets ?? null, t.liabilities ?? null, t.debtRatio ?? null] as never[])
  }
  const kinds: Array<'social' | 'power' | 'water' | 'loan'> = ['social', 'power', 'water', 'loan']
  for (const kind of kinds) {
    for (const m of detail[kind] ?? []) {
      d.run('INSERT OR REPLACE INTO screening_metric (screening_id, kind, year, value) VALUES (?,?,?,?)',
        [id, kind, m.year, m.value ?? null] as never[])
    }
  }
  ;(detail.reportSources ?? []).forEach((s, i) => {
    d.run('INSERT INTO report_source (screening_id, seq, department, warning_reason, issue_date, amount, other) VALUES (?,?,?,?,?,?,?)',
      [id, i, s.department ?? null, s.warningReason ?? null, s.issueDate ?? null, s.amount ?? null, s.other ?? null] as never[])
  })
}

function deleteDetail(d: import('sql.js').Database, id: string) {
  d.run('DELETE FROM screening_tax WHERE screening_id = ?', [id] as never[])
  d.run('DELETE FROM screening_metric WHERE screening_id = ?', [id] as never[])
  d.run('DELETE FROM report_source WHERE screening_id = ?', [id] as never[])
}

export function saveDetail(id: string, detail: StoredDetail): void {
  runWrite(d => {
    deleteDetail(d, id)
    insertDetail(d, id, detail)
  })
}

/** 整体替换全部明细（用于批量导入） */
export function saveAllDetail(map: Record<string, StoredDetail>): void {
  runWrite(d => {
    d.run('DELETE FROM screening_tax')
    d.run('DELETE FROM screening_metric')
    d.run('DELETE FROM report_source')
    for (const id of Object.keys(map)) insertDetail(d, id, map[id])
  })
}
