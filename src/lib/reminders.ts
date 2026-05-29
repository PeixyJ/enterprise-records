// 企业时间节点提醒：按企业记录 id 存储多条 { 描述, 时间 }

export interface TimeNode {
  id: string
  description: string
  date: string // yyyy-mm-dd
}

const REMINDERS_KEY = 'enterprise-records-reminders'

export function loadAllReminders(): Record<string, TimeNode[]> {
  const s = localStorage.getItem(REMINDERS_KEY)
  if (s) try { return JSON.parse(s) } catch { /* */ }
  return {}
}

export function loadReminders(recordId: string): TimeNode[] {
  return loadAllReminders()[recordId] ?? []
}

export function saveReminders(recordId: string, nodes: TimeNode[]) {
  const all = loadAllReminders()
  if (nodes.length) all[recordId] = nodes
  else delete all[recordId]
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(all))
}

export function newNodeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
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
