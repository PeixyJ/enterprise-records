// 企业的镇级 / 市级加入与离开事件时间轴，按企业记录 id 存储多条

export type LevelEventType = 'joinTown' | 'leaveTown' | 'joinCity' | 'leaveCity'

export interface LevelEvent {
  id: string
  type: LevelEventType
  date: string // yyyy-mm-dd
  note?: string // 注释
}

export const LEVEL_EVENT_LABEL: Record<LevelEventType, string> = {
  joinTown: '加入镇级',
  leaveTown: '离开镇级',
  joinCity: '加入市级',
  leaveCity: '离开市级',
}

const LEVEL_TIMELINE_KEY = 'enterprise-records-level-timeline'

function loadAll(): Record<string, LevelEvent[]> {
  const s = localStorage.getItem(LEVEL_TIMELINE_KEY)
  if (s) try { return JSON.parse(s) } catch { /* */ }
  return {}
}

export function newEventId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function loadLevelEvents(recordId: string): LevelEvent[] {
  return loadAll()[recordId] ?? []
}

export function saveLevelEvents(recordId: string, events: LevelEvent[]) {
  const all = loadAll()
  if (events.length) all[recordId] = events
  else delete all[recordId]
  localStorage.setItem(LEVEL_TIMELINE_KEY, JSON.stringify(all))
}

// 追加一条事件（供初筛表切换列入镇级/市级时自动记录）
export function addLevelEvent(recordId: string, type: LevelEventType, date: string) {
  const all = loadAll()
  const list = all[recordId] ?? []
  list.push({ id: newEventId(), type, date })
  all[recordId] = list
  localStorage.setItem(LEVEL_TIMELINE_KEY, JSON.stringify(all))
}
