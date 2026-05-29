// 一次性把旧 localStorage 业务数据迁移到 SQLite，迁移后清除旧 key

import { queryRows, runSQL, SCREENING_STORAGE_KEY, SCREENING_DETAIL_KEY } from './database'
import { saveScreening, saveAllDetail, type StoredDetail, type ReportSourceItem } from './screening-store'
import { saveLevelExtras, type LevelKey } from './level-store'
import { saveGroups } from './group-store'
import { saveLevelEvents, type LevelEvent } from '@/lib/level-timeline'
import { saveReminders, type TimeNode } from '@/lib/reminders'
import { demoData, type ScreeningRecord } from '@/pages/screening'
import type { GroupDef, LevelExtra } from '@/pages/level-table'

const LS = {
  screening: SCREENING_STORAGE_KEY,
  detail: SCREENING_DETAIL_KEY,
  levelCity: 'enterprise-records-level-inCityLevel',
  levelTown: 'enterprise-records-level-inTownLevel',
  levelOther: 'enterprise-records-level-inOther',
  groups: 'enterprise-records-groups',
  timeline: 'enterprise-records-level-timeline',
  reminders: 'enterprise-records-reminders',
}

function parse<T>(key: string): T | null {
  const s = localStorage.getItem(key)
  if (!s) return null
  try { return JSON.parse(s) as T } catch { return null }
}

function isMigrated(): boolean {
  const rows = queryRows("SELECT value FROM meta WHERE key = 'migrated_ls'")
  return rows.length > 0 && rows[0].value === '1'
}

interface OldDetail extends StoredDetail {
  reportSource?: ReportSourceItem // 旧版单条字段
}

export function migrateFromLocalStorage(): void {
  if (isMigrated()) return

  // 初筛主数据：有旧数据用旧数据，否则用 demo 种子
  const screening = parse<ScreeningRecord[]>(LS.screening)
  saveScreening(screening ?? demoData)

  // 明细（税务/人社/电力/水务/金融办/上报记录）
  const detailRaw = parse<Record<string, OldDetail>>(LS.detail)
  if (detailRaw) {
    const map: Record<string, StoredDetail> = {}
    for (const id of Object.keys(detailRaw)) {
      const od = detailRaw[id]
      const reportSources = od.reportSources && od.reportSources.length
        ? od.reportSources
        : (od.reportSource ? [od.reportSource] : undefined)
      map[id] = { tax: od.tax, social: od.social, power: od.power, water: od.water, loan: od.loan, reportSources }
    }
    saveAllDetail(map)
  }

  // 市/镇/其他级别扩展
  const levels: Array<[LevelKey, string]> = [
    ['inCityLevel', LS.levelCity], ['inTownLevel', LS.levelTown], ['inOther', LS.levelOther],
  ]
  for (const [level, key] of levels) {
    const m = parse<Record<string, Partial<LevelExtra>>>(key)
    if (m) saveLevelExtras(level, m)
  }

  // 集团
  const groups = parse<GroupDef[]>(LS.groups)
  if (groups) saveGroups(groups)

  // 镇/市级时间轴
  const timeline = parse<Record<string, LevelEvent[]>>(LS.timeline)
  if (timeline) for (const recordId of Object.keys(timeline)) saveLevelEvents(recordId, timeline[recordId])

  // 时间节点提醒
  const reminders = parse<Record<string, TimeNode[]>>(LS.reminders)
  if (reminders) for (const recordId of Object.keys(reminders)) saveReminders(recordId, reminders[recordId])

  // 清除旧 localStorage 业务数据，标记已迁移
  for (const key of Object.values(LS)) localStorage.removeItem(key)
  runSQL("INSERT OR REPLACE INTO meta (key, value) VALUES ('migrated_ls', '1')")
}
