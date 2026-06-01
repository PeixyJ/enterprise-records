// 多 Sheet 一键导入：将解析后的记录直接合并写入数据库（不依赖任何页面的 React 状态）。
// 合并逻辑与 screening.tsx / level-table.tsx 的单 Sheet 导入保持一致。
import type { ScreeningRecord } from '@/pages/screening'
import { loadScreening, saveScreening, loadAllDetail, saveAllDetail } from '@/db/screening-store'
import { loadLevelExtras, saveLevelExtras, type LevelKey } from '@/db/level-store'
import {
  importScreeningExcel,
  importLevelExcel,
  readSheetNames,
  ImportError,
  type ImportedScreeningRecord,
  type ImportedLevelRecord,
} from './excel'

/** 把任意导入异常转成面向用户的中文提示 */
export function formatImportError(err: unknown): string {
  // 带单元格定位的业务错误，直接展示其中文 message
  if (err instanceof ImportError) return err.message
  const msg = err instanceof Error ? err.message : String(err)
  if (/Maximum call stack size exceeded/i.test(msg)) {
    return '保存数据时发生内部错误，请刷新页面后重试；若持续出现请联系开发人员。'
  }
  if (/out of memory|allocation failed/i.test(msg)) {
    return '表格过大导致内存不足，解析失败。请精简表格内容后重新导入。'
  }
  if (/password|encrypted/i.test(msg)) {
    return '该表格已加密，请先取消密码保护后再导入。'
  }
  return '文件无法解析，请确认是有效的 .xlsx/.xls 表格，且格式与导入模板一致。'
}

/** 将初筛记录合并写入数据库，返回导入条数（逻辑同 screening.tsx handleImport） */
export function importScreeningRecordsIntoStore(imported: ImportedScreeningRecord[]): number {
  if (imported.length === 0) return 0

  const data = loadScreening()
  const detail = loadAllDetail()

  // 按年合并：不同年份累计，相同年份取最新导入值
  const mergeByYear = <T extends { year: number }>(prev: T[] | undefined, next: T[] | undefined): T[] => {
    const map = new Map<number, T>()
    for (const item of prev ?? []) map.set(item.year, item)
    for (const item of next ?? []) map.set(item.year, item)
    return Array.from(map.values()).sort((a, b) => a.year - b.year)
  }
  // 追加一条上报记录、按年累计财务数据，返回累计上报条数
  const appendSource = (id: string, r: ImportedScreeningRecord): number => {
    const d = detail[id] ?? {}
    const sources = [...(d.reportSources ?? []), r.reportSource]
    detail[id] = {
      tax: mergeByYear(d.tax, r.tax),
      social: mergeByYear(d.social, r.social),
      power: mergeByYear(d.power, r.power),
      water: mergeByYear(d.water, r.water),
      loan: mergeByYear(d.loan, r.loan),
      reportSources: sources,
    }
    return sources.length
  }
  // 用最新导入的基本信息覆盖
  const mergeBasic = (rec: ScreeningRecord, r: ImportedScreeningRecord, count: number): ScreeningRecord => ({
    ...rec,
    companyName: r.companyName,
    industry: r.industry,
    township: r.township,
    isAboveScale: r.isAboveScale,
    isOperating: r.feedback.isOperating,
    inTownLevel: r.feedback.inTownLevel,
    inCityLevel: r.feedback.inCityLevel,
    reportDate: r.reportDate,
    reportCount: count,
  })

  const result = data.map(r => ({ ...r }))
  const codeToIdx = new Map<string, number>()
  result.forEach((r, i) => { if (r.creditCode && !codeToIdx.has(r.creditCode)) codeToIdx.set(r.creditCode, i) })
  const newRecords: ScreeningRecord[] = []
  const newCodeToIdx = new Map<string, number>()
  const ts = Date.now()

  imported.forEach((r, i) => {
    if (r.creditCode && codeToIdx.has(r.creditCode)) {
      // 与已有记录合并
      const idx = codeToIdx.get(r.creditCode)!
      const count = appendSource(result[idx].id, r)
      result[idx] = mergeBasic(result[idx], r, count)
    } else if (r.creditCode && newCodeToIdx.has(r.creditCode)) {
      // 与本次导入中已出现的同代码记录合并
      const nIdx = newCodeToIdx.get(r.creditCode)!
      const count = appendSource(newRecords[nIdx].id, r)
      newRecords[nIdx] = mergeBasic(newRecords[nIdx], r, count)
    } else {
      // 新建记录
      const id = `imp-${ts}-${i}`
      const count = appendSource(id, r)
      newRecords.push({
        id,
        creditCode: r.creditCode,
        companyName: r.companyName,
        industry: r.industry,
        township: r.township,
        isAboveScale: r.isAboveScale,
        isOperating: r.feedback.isOperating,
        inTownLevel: r.feedback.inTownLevel,
        inCityLevel: r.feedback.inCityLevel,
        inOther: false,
        reportDate: r.reportDate,
        reportCount: count,
      })
      if (r.creditCode) newCodeToIdx.set(r.creditCode, newRecords.length - 1)
    }
  })

  saveAllDetail(detail)
  saveScreening([...newRecords, ...result])
  return imported.length
}

/** 将市级/镇级记录合并写入数据库，返回匹配并更新的条数（逻辑同 level-table.tsx handleImport） */
export function importLevelRecordsIntoStore(imported: ImportedLevelRecord[], level: LevelKey): number {
  if (imported.length === 0) return 0

  // 仅匹配该级别在库企业（与单 Sheet 导入的 baseData 过滤一致）
  const candidates = loadScreening().filter(r => r[level])
  const newExtras = { ...loadLevelExtras(level) }
  let count = 0

  for (const rec of imported) {
    const match = candidates.find(
      r => (rec.creditCode && r.creditCode === rec.creditCode) || r.companyName === rec.companyName,
    )
    if (!match) continue
    const existing = newExtras[match.creditCode] ?? {}
    newExtras[match.creditCode] = {
      businessStatus: rec.businessStatus || existing.businessStatus,
      assetStatus: rec.assetStatus || existing.assetStatus,
      debtStatus: rec.debtStatus || existing.debtStatus,
      staffStatus: rec.staffStatus || existing.staffStatus,
      otherFeedback: rec.otherFeedback || existing.otherFeedback,
      coordination: rec.coordination || existing.coordination,
      progress: rec.progress.length > 0 ? rec.progress : existing.progress,
    }
    count++
  }

  saveLevelExtras(level, newExtras)
  return count
}

/** 单个工作表的导入结果 */
export interface SheetResult {
  found: boolean // 工作簿中是否存在该工作表
  parsed: number // 从工作表解析出的有效记录条数
  imported: number // 实际入库/匹配的条数
}

export interface ImportSummary {
  fileName: string
  sheetNames: string[] // 工作簿实际包含的全部工作表名
  screening: SheetResult
  city: SheetResult
  town: SheetResult
}

/**
 * 一键导入一个含多个 Sheet 的工作簿：依次解析「初筛」「市级」「镇级」并合并入库。
 * 缺失的 Sheet 自动跳过。先导入初筛（可能更新市级/镇级归属），再导入市级、镇级。
 * 返回每个工作表的详细结果，供调用方对「格式不正确」给出具体原因。
 */
export async function importWorkbookFile(file: File): Promise<ImportSummary> {
  const sheetNames = await readSheetNames(file)
  const hasScreening = sheetNames.some(n => n.includes('初筛'))
  const hasCity = sheetNames.some(n => n.includes('市级'))
  const hasTown = sheetNames.some(n => n.includes('镇级'))

  const screeningRecords = hasScreening ? await importScreeningExcel(file, n => n.includes('初筛')) : []
  const screeningImported = importScreeningRecordsIntoStore(screeningRecords)

  const cityRecords = hasCity ? await importLevelExcel(file, n => n.includes('市级')) : []
  const cityImported = importLevelRecordsIntoStore(cityRecords, 'inCityLevel')

  const townRecords = hasTown ? await importLevelExcel(file, n => n.includes('镇级')) : []
  const townImported = importLevelRecordsIntoStore(townRecords, 'inTownLevel')

  return {
    fileName: file.name,
    sheetNames,
    screening: { found: hasScreening, parsed: screeningRecords.length, imported: screeningImported },
    city: { found: hasCity, parsed: cityRecords.length, imported: cityImported },
    town: { found: hasTown, parsed: townRecords.length, imported: townImported },
  }
}

/** 将导入结果分析为人类可读的问题清单（无问题则返回空数组） */
export function describeImportProblems(r: ImportSummary): string[] {
  const out: string[] = []
  const f = r.fileName

  if (!r.screening.found && !r.city.found && !r.town.found) {
    out.push(`「${f}」未找到「初筛」「市级」或「镇级」工作表，该文件包含的工作表为：${r.sheetNames.join('、') || '（空）'}`)
    return out
  }

  if (r.screening.found && r.screening.parsed === 0) {
    out.push(`「${f}」的「初筛」工作表未读取到有效数据（表头应在第 5 行、数据从第 6 行开始，且社会信用代码与企业名称不能为空）`)
  }
  if (r.city.found) {
    if (r.city.parsed === 0) {
      out.push(`「${f}」的「市级」工作表未读取到有效数据（表头应在第 2-3 行、数据从第 4 行开始）`)
    } else if (r.city.imported === 0) {
      out.push(`「${f}」的「市级」工作表解析到 ${r.city.parsed} 条，但都未匹配到在库企业（这些企业需先存在于初筛表且已列入市级）`)
    }
  }
  if (r.town.found) {
    if (r.town.parsed === 0) {
      out.push(`「${f}」的「镇级」工作表未读取到有效数据（表头应在第 2-3 行、数据从第 4 行开始）`)
    } else if (r.town.imported === 0) {
      out.push(`「${f}」的「镇级」工作表解析到 ${r.town.parsed} 条，但都未匹配到在库企业（这些企业需先存在于初筛表且已列入镇级）`)
    }
  }
  return out
}
