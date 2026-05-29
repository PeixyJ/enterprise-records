import type { LevelExtra, ProgressEntry } from '@/pages/level-table'
import { queryRows, runWrite } from './database'

export type LevelKey = 'inCityLevel' | 'inTownLevel' | 'inOther'

const strOrU = (v: unknown): string | undefined => (v == null ? undefined : (v as string))

function buildExtras(
  extras: Record<string, unknown>[],
  progress: Record<string, unknown>[],
): Record<string, Partial<LevelExtra>> {
  const map: Record<string, Partial<LevelExtra>> = {}
  for (const e of extras) {
    const code = e.credit_code as string
    const partial: Partial<LevelExtra> = {}
    const fields: Array<[keyof LevelExtra, string]> = [
      ['businessStatus', 'business_status'], ['assetStatus', 'asset_status'],
      ['debtStatus', 'debt_status'], ['staffStatus', 'staff_status'],
      ['otherFeedback', 'other_feedback'], ['coordination', 'coordination'],
    ]
    for (const [key, col] of fields) {
      const v = strOrU(e[col])
      if (v !== undefined) (partial as Record<string, unknown>)[key] = v
    }
    map[code] = partial
  }
  for (const p of progress) {
    const code = p.credit_code as string
    const partial = (map[code] ??= {})
    ;(partial.progress ??= []).push({
      date: (p.date as string) ?? '',
      content: (p.content as string) ?? '',
      instruction: (p.instruction as string) ?? '',
    })
  }
  return map
}

export function loadLevelExtras(level: LevelKey): Record<string, Partial<LevelExtra>> {
  const extras = queryRows('SELECT * FROM level_extra WHERE level = ?', [level])
  const progress = queryRows('SELECT * FROM level_progress WHERE level = ? ORDER BY seq, id', [level])
  return buildExtras(extras, progress)
}

function insertExtra(d: import('sql.js').Database, level: LevelKey, code: string, extra: Partial<LevelExtra>) {
  d.run(
    `INSERT OR REPLACE INTO level_extra (level, credit_code, business_status, asset_status, debt_status, staff_status, other_feedback, coordination)
     VALUES (?,?,?,?,?,?,?,?)`,
    [level, code, extra.businessStatus ?? null, extra.assetStatus ?? null, extra.debtStatus ?? null,
      extra.staffStatus ?? null, extra.otherFeedback ?? null, extra.coordination ?? null] as never[],
  )
  ;(extra.progress ?? []).forEach((p: ProgressEntry, i) => {
    d.run('INSERT INTO level_progress (level, credit_code, seq, date, content, instruction) VALUES (?,?,?,?,?,?)',
      [level, code, i, p.date, p.content, p.instruction] as never[])
  })
}

export function saveLevelExtras(level: LevelKey, map: Record<string, Partial<LevelExtra>>): void {
  runWrite(d => {
    d.run('DELETE FROM level_extra WHERE level = ?', [level] as never[])
    d.run('DELETE FROM level_progress WHERE level = ?', [level] as never[])
    for (const code of Object.keys(map)) insertExtra(d, level, code, map[code])
  })
}

/** 按社会信用代码查找任一级别的扩展数据（供企业/集团详情读取进展） */
export function loadLevelExtraByCode(creditCode: string): Partial<LevelExtra> | null {
  if (!creditCode) return null
  const extras = queryRows('SELECT * FROM level_extra WHERE credit_code = ? LIMIT 1', [creditCode])
  if (!extras.length) return null
  const level = extras[0].level as LevelKey
  const progress = queryRows('SELECT * FROM level_progress WHERE level = ? AND credit_code = ? ORDER BY seq, id', [level, creditCode])
  return buildExtras(extras, progress)[creditCode] ?? null
}
