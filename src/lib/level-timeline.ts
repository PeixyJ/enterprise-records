// 企业的镇级 / 市级加入与离开事件时间轴，存储于 SQLite（level_event 表）

import { queryRows, runWrite, runSQL } from '@/db/database'

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

function rowToEvent(r: Record<string, unknown>): LevelEvent {
  return {
    id: r.id as string,
    type: r.type as LevelEventType,
    date: (r.date as string) ?? '',
    note: r.note == null ? undefined : (r.note as string),
  }
}

export function loadLevelEvents(recordId: string): LevelEvent[] {
  return queryRows('SELECT * FROM level_event WHERE record_id = ? ORDER BY date, rowid', [recordId]).map(rowToEvent)
}

export function saveLevelEvents(recordId: string, events: LevelEvent[]) {
  runWrite(d => {
    d.run('DELETE FROM level_event WHERE record_id = ?', [recordId] as never[])
    for (const e of events) {
      d.run('INSERT INTO level_event (id, record_id, type, date, note) VALUES (?,?,?,?,?)',
        [e.id, recordId, e.type, e.date, e.note ?? null] as never[])
    }
  })
}

// 事件所属类别：镇级 / 市级
export function eventCategory(type: LevelEventType): 'town' | 'city' {
  return type === 'joinTown' || type === 'leaveTown' ? 'town' : 'city'
}

// 在同类（镇级/市级）事件中，给定日期是否为最新（不存在比它更晚的同类事件，含并列最新）
export function isLatestInCategory(events: LevelEvent[], category: 'town' | 'city', date: string): boolean {
  return !events.some(e => eventCategory(e.type) === category && e.date > date)
}

// 追加一条事件（供初筛表切换列入镇级/市级时自动记录）
export function addLevelEvent(recordId: string, type: LevelEventType, date: string) {
  runSQL('INSERT INTO level_event (id, record_id, type, date, note) VALUES (?,?,?,?,?)',
    [newEventId(), recordId, type, date, null])
}
