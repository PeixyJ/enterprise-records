import * as XLSX_PLAIN from "xlsx"
import * as XLSX from "xlsx-js-style"
import JSZip from "jszip"

/** 将二维数组或对象数组导出为 .xlsx 文件并触发下载 */
export function exportToExcel(
  data: Record<string, unknown>[] | unknown[][],
  filename = "export.xlsx",
  sheetName = "Sheet1"
): void {
  const ws = Array.isArray(data[0])
    ? XLSX.utils.aoa_to_sheet(data as unknown[][])
    : XLSX.utils.json_to_sheet(data as Record<string, unknown>[])

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}

/** 从 File 对象读取 Excel，返回对象数组（默认第一个 sheet） */
export async function importFromExcel<T = Record<string, unknown>>(
  file: File,
  sheetIndex = 0
): Promise<T[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX_PLAIN.read(buf, { type: "array" })
  const sheetName = wb.SheetNames[sheetIndex]
  const ws = wb.Sheets[sheetName]
  return XLSX_PLAIN.utils.sheet_to_json<T>(ws)
}

/** 从 File 对象读取 Excel，返回所有 sheet 的数据 */
export async function importAllSheets<T = Record<string, unknown>>(
  file: File
): Promise<{ name: string; data: T[] }[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX_PLAIN.read(buf, { type: "array" })
  return wb.SheetNames.map((name) => ({
    name,
    data: XLSX_PLAIN.utils.sheet_to_json<T>(wb.Sheets[name]),
  }))
}

// ── 初筛表专用导入 ──────────────────────────────────

export interface ImportedScreeningRecord {
  creditCode: string
  companyName: string
  industry: string
  township: string
  isAboveScale: boolean
  reportDate: string
  reportCount: number
  // 税务（按年）
  tax: { year: number; revenue?: number; profit?: number; taxPayable?: number; assets?: number; liabilities?: number; debtRatio?: number }[]
  // 人社
  social: { year: number; value?: number }[]
  // 电力
  power: { year: number; value?: number }[]
  // 水务
  water: { year: number; value?: number }[]
  // 金融办
  loan: { year: number; value?: number }[]
  // 信息来源
  reportSource: {
    department?: string
    warningReason?: string
    issueDate?: string
    amount?: number
    other?: string
  }
  // 乡镇反馈
  feedback: {
    isOperating: boolean
    inTownLevel: boolean
    inCityLevel: boolean
    extra?: string
  }
}

function parseBool(v: unknown): boolean {
  if (typeof v === 'string') return v.trim() === '是'
  if (typeof v === 'boolean') return v
  return false
}

function parseNum(v: unknown): number | undefined {
  if (v == null || v === '') return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

function parseDate(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'number') {
    // Excel serial date number
    const d = new Date((v - 25569) * 86400000)
    return d.toISOString().slice(0, 10)
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v)
}

/**
 * 解析初筛表 Excel 文件（"初筛" sheet）
 * 表头在第5行，数据从第6行开始
 * 列结构见导入表格模板
 */
export async function importScreeningExcel(file: File): Promise<ImportedScreeningRecord[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX_PLAIN.read(buf, { type: "array" })

  // 找到"初筛" sheet，找不到则用第一个
  const sheetName = wb.SheetNames.find(n => n.includes('初筛')) ?? wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows: unknown[][] = XLSX_PLAIN.utils.sheet_to_json(ws, { header: 1, defval: null })

  // 数据从第6行开始（index 5），前5行是表头
  const dataRows = rows.slice(5)
  const records: ImportedScreeningRecord[] = []

  for (const row of dataRows) {
    if (!row || !row[1] || !row[2]) continue // 跳过社会信用代码或企业名称为空的行

    const r = (i: number) => row[i] ?? null

    records.push({
      creditCode: String(r(1) ?? ''),
      companyName: String(r(2) ?? ''),
      industry: String(r(3) ?? ''),
      township: String(r(4) ?? ''),
      isAboveScale: parseBool(r(5)),
      reportDate: parseDate(r(6)),
      reportCount: parseNum(r(7)) ?? 0,
      tax: [
        { year: 2025, revenue: parseNum(r(8)), profit: parseNum(r(10)), taxPayable: parseNum(r(12)), assets: parseNum(r(14)), liabilities: parseNum(r(16)), debtRatio: parseNum(r(18)) },
        { year: 2026, revenue: parseNum(r(9)), profit: parseNum(r(11)), taxPayable: parseNum(r(13)), assets: parseNum(r(15)), liabilities: parseNum(r(17)), debtRatio: parseNum(r(19)) },
      ],
      social: [
        { year: 2025, value: parseNum(r(20)) },
        { year: 2026, value: parseNum(r(21)) },
      ],
      power: [
        { year: 2025, value: parseNum(r(22)) },
        { year: 2026, value: parseNum(r(23)) },
      ],
      water: [
        { year: 2025, value: parseNum(r(24)) },
        { year: 2026, value: parseNum(r(25)) },
      ],
      loan: [
        { year: 2025, value: parseNum(r(26)) },
        { year: 2026, value: parseNum(r(27)) },
      ],
      reportSource: {
        department: r(28) != null ? String(r(28)) : undefined,
        warningReason: r(29) != null ? String(r(29)) : undefined,
        issueDate: r(30) != null ? parseDate(r(30)) : undefined,
        amount: parseNum(r(31)),
        other: r(32) != null ? String(r(32)) : undefined,
      },
      feedback: {
        isOperating: parseBool(r(33)),
        inTownLevel: parseBool(r(34)),
        inCityLevel: parseBool(r(35)),
        extra: r(36) != null ? String(r(36)) : undefined,
      },
    })
  }

  return records
}

// ── 市级/镇级表导入 ──────────────────────────────────

export interface ImportedLevelRecord {
  creditCode: string
  companyName: string
  industry: string
  township: string
  businessStatus: string
  assetStatus: string
  debtStatus: string
  staffStatus: string
  otherFeedback: string
  coordination: string
  progress: { date: string; content: string; instruction: string }[]
}

function excelDateToString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400000)
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }
  if (v instanceof Date) {
    return `${v.getFullYear()}年${v.getMonth() + 1}月${v.getDate()}日`
  }
  return String(v)
}

/**
 * 解析市级/镇级表 Excel
 * Row 1: 标题, Row 2-3: 表头, Row 4+: 数据
 * 列: 0序号 1信用代码 2企业名称 3行业 4属地 5经营情况 6-7资产情况 8负债情况 9员工情况 10其他反馈 11协调事项
 * 12+: 每2列一组(进展+批示)，对应 Row 2 中的日期
 */
export async function importLevelExcel(file: File): Promise<ImportedLevelRecord[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX_PLAIN.read(buf, { type: "array", cellDates: true })
  const sheetName = wb.SheetNames.find(n => n.includes('市级') || n.includes('镇级')) ?? wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows: unknown[][] = XLSX_PLAIN.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false })

  if (rows.length < 4) return []

  // Row 2 (index 1) 从列12开始包含日期
  const headerRow = rows[1] as unknown[]
  const progressDates: string[] = []
  for (let c = 12; c < headerRow.length; c += 2) {
    progressDates.push(excelDateToString(headerRow[c]))
  }

  const dataRows = rows.slice(3) // Row 4+ (index 3+)
  const records: ImportedLevelRecord[] = []

  for (const row of dataRows) {
    if (!row || (!row[1] && !row[2])) continue // 跳过空行
    const r = (i: number) => row[i] ?? null

    // 解析进展
    const progress: { date: string; content: string; instruction: string }[] = []
    for (let i = 0; i < progressDates.length; i++) {
      const colBase = 12 + i * 2
      const content = r(colBase) != null ? String(r(colBase)) : ''
      const instruction = r(colBase + 1) != null ? String(r(colBase + 1)) : ''
      if (content || instruction) {
        progress.push({ date: progressDates[i], content, instruction })
      }
    }

    records.push({
      creditCode: String(r(1) ?? ''),
      companyName: String(r(2) ?? ''),
      industry: String(r(3) ?? ''),
      township: String(r(4) ?? ''),
      businessStatus: String(r(5) ?? ''),
      assetStatus: String(r(6) ?? '') + (r(7) ? ' ' + String(r(7)) : ''),
      debtStatus: String(r(8) ?? ''),
      staffStatus: String(r(9) ?? ''),
      otherFeedback: String(r(10) ?? ''),
      coordination: String(r(11) ?? ''),
      progress,
    })
  }

  return records
}

// ── 初筛表模板格式导出 ──────────────────────────────

interface ExportableRecord {
  creditCode: string
  companyName: string
  industry: string
  township: string
  isAboveScale: boolean
  isOperating: boolean
  inTownLevel: boolean
  inCityLevel: boolean
  reportDate: string
  reportCount: number
}

// 5 行表头（匹配导入模板 37 列）
const TEMPLATE_HEADERS: (string | number | null)[][] = [
  ['基础信息表', ...Array(36).fill(null)],
  ['基本信息', null, null, null, null, null, null, null, '其他信息', ...Array(19).fill(null), '信息来源', null, null, null, null, '乡镇反馈意见', null, null, null],
  [null, null, null, null, null, null, null, null, '税务', null, null, null, null, null, null, null, null, null, null, null, '人社', null, '电力', null, '水务', null, '金融办', null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, '营收', null, '利润', null, '应交税金', null, '资产', null, '负债', null, '资产负债率', null, '社保人数', null, '用电量(万度)', null, '用水量(吨)', null, '贷款月均余额', null, null, null, null, null, null, null, null, null, null],
  ['序号', '社会信用代码', '企业名称', '行业', '街道乡镇', '是否规上', '上报时间', '上报次数', 2025, 2026, 2025, 2026, 2025, 2026, 2025, 2026, 2025, 2026, 2025, 2026, 2025, 2026, 2025, 2026, 2025, 2026, 2025, 2026, '报送部门', '预警理由', '问题出现的时间', '金额', '其他信息', '是否正常运营', '建议列入镇级', '建议列入市级', '具体信息补充'],
]

function recordToRow(r: ExportableRecord, index: number): (string | number | boolean | null)[] {
  return [
    index + 1,                          // 序号
    r.creditCode,                       // 社会信用代码
    r.companyName,                      // 企业名称
    r.industry,                         // 行业
    r.township,                         // 街道乡镇
    r.isAboveScale ? '是' : '',         // 是否规上
    r.reportDate,                       // 上报时间
    r.reportCount,                      // 上报次数
    // 税务 2025/2026（8-19 共12列，暂无数据填空）
    null, null, null, null, null, null, null, null, null, null, null, null,
    // 人社 2025/2026（20-21）
    null, null,
    // 电力 2025/2026（22-23）
    null, null,
    // 水务 2025/2026（24-25）
    null, null,
    // 金融办 2025/2026（26-27）
    null, null,
    // 信息来源（28-32）
    null, null, null, null, null,
    // 乡镇反馈意见（33-36）
    r.isOperating ? '是' : '',          // 是否正常运营
    r.inTownLevel ? '是' : '',          // 建议列入镇级
    r.inCityLevel ? '是' : '',          // 建议列入市级
    null,                               // 具体信息补充
  ]
}

const THIN_BORDER = { style: 'thin', color: { rgb: '000000' } } as const
const BORDER_ALL = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER }

const HEADER_FILL = { fgColor: { rgb: 'D9E1F2' } }  // 浅蓝色
const HEADER_FONT = { bold: true, sz: 11 }
const TITLE_FONT = { bold: true, sz: 14 }
const CENTER = { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true }

function buildScreeningWorkbook(records: ExportableRecord[]): XLSX.WorkBook {
  const aoa = [
    ...TEMPLATE_HEADERS,
    ...records.map((r, i) => recordToRow(r, i)),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // 合并单元格
  ws['!merges'] = [
    // Row 1: 基础信息表 (A1:AK1)
    { s: { r: 0, c: 0 }, e: { r: 0, c: 36 } },
    // Row 2: 基本信息 (A2:H2)
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    // Row 2: 其他信息 (I2:AB2)
    { s: { r: 1, c: 8 }, e: { r: 1, c: 27 } },
    // Row 2: 信息来源 (AC2:AG2)
    { s: { r: 1, c: 28 }, e: { r: 1, c: 32 } },
    // Row 2: 乡镇反馈意见 (AH2:AK2)
    { s: { r: 1, c: 33 }, e: { r: 1, c: 36 } },
    // Row 3: 税务 (I3:T3)
    { s: { r: 2, c: 8 }, e: { r: 2, c: 19 } },
    // Row 3: 人社 (U3:V3)
    { s: { r: 2, c: 20 }, e: { r: 2, c: 21 } },
    // Row 3: 电力 (W3:X3)
    { s: { r: 2, c: 22 }, e: { r: 2, c: 23 } },
    // Row 3: 水务 (Y3:Z3)
    { s: { r: 2, c: 24 }, e: { r: 2, c: 25 } },
    // Row 3: 金融办 (AA3:AB3)
    { s: { r: 2, c: 26 }, e: { r: 2, c: 27 } },
    // Row 4: 营收 (I4:J4)
    { s: { r: 3, c: 8 }, e: { r: 3, c: 9 } },
    // Row 4: 利润 (K4:L4)
    { s: { r: 3, c: 10 }, e: { r: 3, c: 11 } },
    // Row 4: 应交税金 (M4:N4)
    { s: { r: 3, c: 12 }, e: { r: 3, c: 13 } },
    // Row 4: 资产 (O4:P4)
    { s: { r: 3, c: 14 }, e: { r: 3, c: 15 } },
    // Row 4: 负债 (Q4:R4)
    { s: { r: 3, c: 16 }, e: { r: 3, c: 17 } },
    // Row 4: 资产负债率 (S4:T4)
    { s: { r: 3, c: 18 }, e: { r: 3, c: 19 } },
    // Row 4: 社保人数 (U4:V4)
    { s: { r: 3, c: 20 }, e: { r: 3, c: 21 } },
    // Row 4: 用电量 (W4:X4)
    { s: { r: 3, c: 22 }, e: { r: 3, c: 23 } },
    // Row 4: 用水量 (Y4:Z4)
    { s: { r: 3, c: 24 }, e: { r: 3, c: 25 } },
    // Row 4: 贷款月均余额 (AA4:AB4)
    { s: { r: 3, c: 26 }, e: { r: 3, c: 27 } },
    // Row 2-4 基本信息下方竖向合并：A2:A4 ~ H2:H4 的列标题
    ...Array.from({ length: 8 }, (_, c) => ({ s: { r: 1, c }, e: { r: 1, c } })),
    // Row 2-4 信息来源下方各列: AC2:AC4 ~ AG2:AG4
    ...Array.from({ length: 5 }, (_, i) => ({ s: { r: 1, c: 28 + i }, e: { r: 1, c: 28 + i } })),
    // Row 2-4 乡镇反馈各列: AH2:AH4 ~ AK2:AK4
    ...Array.from({ length: 4 }, (_, i) => ({ s: { r: 1, c: 33 + i }, e: { r: 1, c: 33 + i } })),
  ]

  // 列宽
  ws['!cols'] = [
    { wch: 5 },   // 序号
    { wch: 22 },  // 社会信用代码
    { wch: 20 },  // 企业名称
    { wch: 10 },  // 行业
    { wch: 14 },  // 街道乡镇
    { wch: 8 },   // 是否规上
    { wch: 12 },  // 上报时间
    { wch: 8 },   // 上报次数
    ...Array(20).fill({ wch: 10 }),  // 税务/人社/电力/水务/金融办 各年列
    { wch: 10 },  // 报送部门
    { wch: 20 },  // 预警理由
    { wch: 14 },  // 问题出现的时间
    { wch: 10 },  // 金额
    { wch: 14 },  // 其他信息
    { wch: 12 },  // 是否正常运营
    { wch: 12 },  // 建议列入镇级
    { wch: 12 },  // 建议列入市级
    { wch: 16 },  // 具体信息补充
  ]

  // 应用样式到所有单元格
  const totalRows = 5 + records.length
  const totalCols = 37
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  range.e.c = Math.max(range.e.c, totalCols - 1)
  range.e.r = Math.max(range.e.r, totalRows - 1)
  ws['!ref'] = XLSX.utils.encode_range(range)

  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      if (!ws[addr]) ws[addr] = { v: '', t: 's' }
      const cell = ws[addr]

      // 边框
      cell.s = { ...cell.s, border: BORDER_ALL }

      if (r === 0) {
        // 标题行
        cell.s = { ...cell.s, border: BORDER_ALL, font: TITLE_FONT, alignment: CENTER }
      } else if (r >= 1 && r <= 4) {
        // 表头行
        cell.s = { ...cell.s, border: BORDER_ALL, font: HEADER_FONT, fill: HEADER_FILL, alignment: CENTER }
      } else {
        // 数据行
        cell.s = { ...cell.s, border: BORDER_ALL, alignment: { vertical: 'center' as const, wrapText: true } }
      }
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '初筛')
  return wb
}

/** 导出所有数据为单个 xlsx（模板格式） */
export function exportScreeningAll(records: ExportableRecord[], filename = '初筛表-全部.xlsx'): void {
  const wb = buildScreeningWorkbook(records)
  XLSX.writeFile(wb, filename)
}

/** 按行业×乡镇分组导出为 zip */
export async function exportScreeningZip(
  records: ExportableRecord[],
  industries: string[],
  townships: string[],
): Promise<void> {
  const zip = new JSZip()
  let fileCount = 0

  for (const township of townships) {
    for (const industry of industries) {
      const group = records.filter(r => r.industry === industry && r.township === township)
      if (group.length === 0) continue
      const wb = buildScreeningWorkbook(group)
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      zip.file(`${township}-${industry}-上报表格.xlsx`, buf)
      fileCount++
    }
  }

  if (fileCount === 0) {
    alert('没有符合条件的数据可导出')
    return
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `初筛表-分类导出-${new Date().toISOString().slice(0, 10)}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

// ── 市级/镇级表模板格式导出 ──────────────────────────

interface ExportableLevelRecord {
  creditCode: string
  companyName: string
  industry: string
  township: string
  businessStatus: string
  assetStatus: string
  debtStatus: string
  staffStatus: string
  otherFeedback: string
  coordination: string
  progress: { date: string; content: string; instruction: string }[]
}

function buildLevelWorkbook(records: ExportableLevelRecord[], sheetTitle: string): XLSX.WorkBook {
  // 收集所有进展日期（去重、排序）
  const allDates = new Set<string>()
  for (const r of records) {
    for (const p of r.progress) {
      if (p.date) allDates.add(p.date)
    }
  }
  const sortedDates = Array.from(allDates).sort()
  // 如果没有进展日期，添加一个默认的
  if (sortedDates.length === 0) sortedDates.push('')

  const totalCols = 12 + sortedDates.length * 2

  // Row 1: 标题
  const row1: (string | null)[] = [sheetTitle, ...Array(totalCols - 1).fill(null)]

  // Row 2: 表头第一行
  const row2: (string | null)[] = [
    '序号', '信用代码', '企业名称', '行业', '属地',
    '基本情况', null, null, null, null, null,
    '需要协调的事项',
  ]
  for (const d of sortedDates) {
    row2.push(d, null)
  }

  // Row 3: 表头第二行
  const row3: (string | null)[] = [
    null, null, null, null, null,
    '经营情况', '资产情况', null, '负债情况', '员工情况', '其他需要反馈的情况',
    null,
  ]
  for (let i = 0; i < sortedDates.length; i++) {
    row3.push('进展', '批示')
  }

  // 数据行
  const dataRows: (string | number | null)[][] = records.map((r, i) => {
    const row: (string | number | null)[] = [
      i + 1,
      r.creditCode,
      r.companyName,
      r.industry,
      r.township,
      r.businessStatus || null,
      r.assetStatus || null,
      null,
      r.debtStatus || null,
      r.staffStatus || null,
      r.otherFeedback || null,
      r.coordination || null,
    ]
    // 按日期匹配进展
    const progressMap = new Map<string, { content: string; instruction: string }>()
    for (const p of r.progress) {
      if (p.date) progressMap.set(p.date, p)
    }
    for (const d of sortedDates) {
      const p = progressMap.get(d)
      row.push(p?.content || null, p?.instruction || null)
    }
    return row
  })

  const aoa = [row1, row2, row3, ...dataRows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // 合并单元格
  ws['!merges'] = [
    // Row 1: 标题
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    // Row 2-3 竖向合并: 序号、信用代码、企业名称、行业、属地、需要协调的事项
    { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
    { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },
    { s: { r: 1, c: 2 }, e: { r: 2, c: 2 } },
    { s: { r: 1, c: 3 }, e: { r: 2, c: 3 } },
    { s: { r: 1, c: 4 }, e: { r: 2, c: 4 } },
    { s: { r: 1, c: 11 }, e: { r: 2, c: 11 } },
    // Row 2: 基本情况 (F2:K2)
    { s: { r: 1, c: 5 }, e: { r: 1, c: 10 } },
    // Row 3: 资产情况 (G3:H3)
    { s: { r: 2, c: 6 }, e: { r: 2, c: 7 } },
    // Row 2: 每个日期 (2列合并)
    ...sortedDates.map((_, i) => ({
      s: { r: 1, c: 12 + i * 2 }, e: { r: 1, c: 13 + i * 2 },
    })),
  ]

  // 列宽
  ws['!cols'] = [
    { wch: 5 },   // 序号
    { wch: 22 },  // 信用代码
    { wch: 18 },  // 企业名称
    { wch: 10 },  // 行业
    { wch: 12 },  // 属地
    { wch: 14 },  // 经营情况
    { wch: 12 },  // 资产情况
    { wch: 4 },   // (资产合并)
    { wch: 12 },  // 负债情况
    { wch: 12 },  // 员工情况
    { wch: 16 },  // 其他反馈
    { wch: 16 },  // 协调事项
    ...sortedDates.flatMap(() => [{ wch: 14 }, { wch: 10 }]),
  ]

  // 样式
  const totalRows = 3 + records.length
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  range.e.c = Math.max(range.e.c, totalCols - 1)
  range.e.r = Math.max(range.e.r, totalRows - 1)
  ws['!ref'] = XLSX.utils.encode_range(range)

  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      if (!ws[addr]) ws[addr] = { v: '', t: 's' }
      const cell = ws[addr]
      cell.s = { ...cell.s, border: BORDER_ALL }
      if (r === 0) {
        cell.s = { ...cell.s, border: BORDER_ALL, font: TITLE_FONT, alignment: CENTER }
      } else if (r <= 2) {
        cell.s = { ...cell.s, border: BORDER_ALL, font: HEADER_FONT, fill: HEADER_FILL, alignment: CENTER }
      } else {
        cell.s = { ...cell.s, border: BORDER_ALL, alignment: { vertical: 'center' as const, wrapText: true } }
      }
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle.replace('表', ''))
  return wb
}

/** 导出市级/镇级表所有数据为单个 xlsx */
export function exportLevelAll(records: ExportableLevelRecord[], title: string, filename?: string): void {
  const wb = buildLevelWorkbook(records, title)
  XLSX.writeFile(wb, filename ?? `${title}-全部.xlsx`)
}

/** 按行业×乡镇分组导出市级/镇级表为 zip */
export async function exportLevelZip(
  records: ExportableLevelRecord[],
  industries: string[],
  townships: string[],
  title: string,
): Promise<void> {
  const zip = new JSZip()
  let fileCount = 0

  for (const township of townships) {
    for (const industry of industries) {
      const group = records.filter(r => r.industry === industry && r.township === township)
      if (group.length === 0) continue
      const wb = buildLevelWorkbook(group, title)
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      zip.file(`${township}-${industry}-${title}.xlsx`, buf)
      fileCount++
    }
  }

  if (fileCount === 0) {
    alert('没有符合条件的数据可导出')
    return
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}-分类导出-${new Date().toISOString().slice(0, 10)}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

/** 按行业×乡镇导出分类问卷（进展日期只有截止日期一列，内容为空待填写） */
export async function exportLevelQuestionnaire(
  records: ExportableLevelRecord[],
  industries: string[],
  townships: string[],
  title: string,
  deadline: string,
): Promise<void> {
  const zip = new JSZip()
  let fileCount = 0

  for (const township of townships) {
    for (const industry of industries) {
      const group = records.filter(r => r.industry === industry && r.township === township)
      if (group.length === 0) continue

      // 清空进展，只保留截止日期一列空白待填
      const blanked = group.map(r => ({
        ...r,
        progress: [{ date: deadline, content: '', instruction: '' }],
      }))
      const wb = buildLevelWorkbook(blanked, title)
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      zip.file(`${township}-${industry}-${title}.xlsx`, buf)
      fileCount++
    }
  }

  if (fileCount === 0) {
    alert('没有符合条件的数据可导出')
    return
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}-分类问卷-${new Date().toISOString().slice(0, 10)}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
