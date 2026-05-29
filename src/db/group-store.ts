import type { GroupDef } from '@/pages/level-table'
import { queryRows, runWrite } from './database'

export function loadGroups(): GroupDef[] {
  const groups = queryRows('SELECT * FROM biz_group ORDER BY sort_order, rowid')
  const members = queryRows('SELECT * FROM biz_group_member ORDER BY seq, rowid')
  const byGroup = new Map<string, string[]>()
  for (const m of members) {
    const gid = m.group_id as string
    if (!byGroup.has(gid)) byGroup.set(gid, [])
    byGroup.get(gid)!.push(m.credit_code as string)
  }
  return groups.map(g => ({
    id: g.id as string,
    name: (g.name as string) ?? '',
    members: byGroup.get(g.id as string) ?? [],
  }))
}

export function saveGroups(groups: GroupDef[]): void {
  runWrite(d => {
    d.run('DELETE FROM biz_group')
    d.run('DELETE FROM biz_group_member')
    groups.forEach((g, i) => {
      d.run('INSERT INTO biz_group (id, name, sort_order) VALUES (?,?,?)', [g.id, g.name, i] as never[])
      g.members.forEach((code, j) => {
        d.run('INSERT OR IGNORE INTO biz_group_member (group_id, credit_code, seq) VALUES (?,?,?)', [g.id, code, j] as never[])
      })
    })
  })
}
