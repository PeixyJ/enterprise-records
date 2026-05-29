// 企业时间节点提醒：存储于 SQLite（reminder 表）

import { queryRows, runWrite } from '@/db/database'

export interface TimeNode {
  id: string
  description: string
  date: string // yyyy-mm-dd
}

export function newNodeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function loadAllReminders(): Record<string, TimeNode[]> {
  const rows = queryRows('SELECT * FROM reminder ORDER BY date, rowid')
  const map: Record<string, TimeNode[]> = {}
  for (const r of rows) {
    const recordId = r.record_id as string
    ;(map[recordId] ??= []).push({
      id: r.id as string,
      description: (r.description as string) ?? '',
      date: (r.date as string) ?? '',
    })
  }
  return map
}

export function loadReminders(recordId: string): TimeNode[] {
  return queryRows('SELECT * FROM reminder WHERE record_id = ? ORDER BY date, rowid', [recordId]).map(r => ({
    id: r.id as string,
    description: (r.description as string) ?? '',
    date: (r.date as string) ?? '',
  }))
}

export function saveReminders(recordId: string, nodes: TimeNode[]) {
  runWrite(d => {
    d.run('DELETE FROM reminder WHERE record_id = ?', [recordId] as never[])
    for (const n of nodes) {
      d.run('INSERT INTO reminder (id, record_id, description, date) VALUES (?,?,?,?)',
        [n.id, recordId, n.description, n.date] as never[])
    }
  })
}

// 当前时间是否已超过该时间节点
export function isOverdue(date: string): boolean {
  if (!date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < today.getTime()
}
