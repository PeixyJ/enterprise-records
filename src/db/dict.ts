import { execSQL, runSQL } from "./database"

export interface DictItem {
  id: number
  name: string
  sort_order: number
}

function queryDict(table: string): DictItem[] {
  const results = execSQL(`SELECT id, name, sort_order FROM ${table} ORDER BY sort_order, id`)
  if (results.length === 0) return []
  const rows = results[0] as { columns: string[]; values: unknown[][] }
  return rows.values.map((r) => ({
    id: r[0] as number,
    name: r[1] as string,
    sort_order: r[2] as number,
  }))
}

export function getTownships(): DictItem[] {
  return queryDict("dict_township")
}

export function getIndustries(): DictItem[] {
  return queryDict("dict_industry")
}

export function addTownship(name: string): void {
  const max = execSQL("SELECT COALESCE(MAX(sort_order), -1) FROM dict_township")
  const nextOrder = max.length > 0 ? ((max[0] as { values: unknown[][] }).values[0][0] as number) + 1 : 0
  runSQL("INSERT INTO dict_township (name, sort_order) VALUES (?, ?)", [name, nextOrder])
}

export function addIndustry(name: string): void {
  const max = execSQL("SELECT COALESCE(MAX(sort_order), -1) FROM dict_industry")
  const nextOrder = max.length > 0 ? ((max[0] as { values: unknown[][] }).values[0][0] as number) + 1 : 0
  runSQL("INSERT INTO dict_industry (name, sort_order) VALUES (?, ?)", [name, nextOrder])
}

export function deleteTownship(id: number): void {
  runSQL("DELETE FROM dict_township WHERE id = ?", [id])
}

export function deleteIndustry(id: number): void {
  runSQL("DELETE FROM dict_industry WHERE id = ?", [id])
}

export function updateTownship(id: number, name: string): void {
  runSQL("UPDATE dict_township SET name = ? WHERE id = ?", [name, id])
}

export function updateIndustry(id: number, name: string): void {
  runSQL("UPDATE dict_industry SET name = ? WHERE id = ?", [name, id])
}
