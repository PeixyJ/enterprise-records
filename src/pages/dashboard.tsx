import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Building2Icon,
  BuildingIcon,
  LandmarkIcon,
  FileTextIcon,
  TrendingUpIcon,
  UsersIcon,
  FactoryIcon,
  BellIcon,
  UploadIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { loadScreening } from '@/db/screening-store'
import { loadGroups } from '@/db/group-store'
import { type ScreeningRecord } from './screening'
import { loadAllReminders, isOverdue } from '@/lib/reminders'
import { importWorkbookFile, describeImportProblems, formatImportError } from '@/lib/import-store'

// ── 数据加载 ──────────────────────────────────────

function loadData(): ScreeningRecord[] {
  return loadScreening()
}

// 按集团折叠计数：同一集团的成员只算 1 个，未入任何集团的企业各算 1 个
function countCollapsed(records: ScreeningRecord[], groupOfCode: Map<string, string>): number {
  const seenGroups = new Set<string>()
  let count = 0
  for (const r of records) {
    const gid = r.creditCode ? groupOfCode.get(r.creditCode) : undefined
    if (gid) {
      if (seenGroups.has(gid)) continue
      seenGroups.add(gid)
    }
    count++
  }
  return count
}

// ── 统计卡片 ──────────────────────────────────────

function StatCard({ title, value, icon: Icon, description, color, to }: {
  title: string; value: string | number; icon: React.ElementType; description?: string; color: string; to?: string
}) {
  const navigate = useNavigate()
  return (
    <Card
      className={cn('py-4', to && 'cursor-pointer transition-colors hover:bg-muted/50')}
      onClick={to ? () => navigate(to) : undefined}
    >
      <CardContent className='flex items-center gap-3 px-4 py-0'>
        <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', color)}>
          <Icon className='size-4' />
        </div>
        <div>
          <p className='text-xs text-muted-foreground'>{title}</p>
          <p className='text-lg font-bold leading-tight'>{value}</p>
          {description && <p className='text-xs text-muted-foreground'>{description}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

// ── 主页面 ──────────────────────────────────────────

export default function DashboardPage() {
  const [reloadKey, setReloadKey] = useState(0)
  const data = useMemo(loadData, [reloadKey])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [importResult, setImportResult] = useState<{ summary: string | null; problems: string[] } | null>(null)

  const openImport = () => {
    setImportResult(null)
    setImportOpen(true)
  }

  // 下载导入模板（public/import-template.xlsx，下载时显示中文名）
  const handleDownloadTemplate = async () => {
    const url = window.location.protocol === 'file:' ? './import-template.xlsx' : '/import-template.xlsx'
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = '表格模板.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('模板下载失败:', err)
      alert('模板下载失败，请重试')
    }
  }

  // 核心导入逻辑，供点击选择与拖拽共用
  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f => /\.(xlsx|xls)$/i.test(f.name))
    if (files.length === 0) {
      setImportResult({ summary: null, problems: ['请选择 .xlsx 或 .xls 格式的 Excel 文件'] })
      return
    }
    setImporting(true)
    setImportResult(null)
    try {
      const total = { screening: 0, city: 0, town: 0 }
      const problems: string[] = []
      for (const file of files) {
        try {
          const s = await importWorkbookFile(file)
          total.screening += s.screening.imported
          total.city += s.city.imported
          total.town += s.town.imported
          problems.push(...describeImportProblems(s))
        } catch (err) {
          // 单个文件解析出错（如某单元格为空），定位到文件后继续处理其余文件
          console.error(`导入「${file.name}」失败:`, err)
          problems.push(`「${file.name}」导入失败：${formatImportError(err)}`)
        }
      }
      setReloadKey(k => k + 1)
      const importedAny = total.screening || total.city || total.town
      setImportResult({
        summary: importedAny ? `导入成功：初筛 ${total.screening} 条，市级 ${total.city} 条，镇级 ${total.town} 条` : null,
        problems,
      })
    } catch (err) {
      console.error('导入失败:', err)
      setImportResult({ summary: null, problems: ['导入失败：' + formatImportError(err)] })
    } finally {
      setImporting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (importing) return
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files)
  }

  // 集团映射：社会信用代码 → 集团 id（用于将同集团企业折叠为一个计数）
  const groupOfCode = useMemo(() => {
    const m = new Map<string, string>()
    for (const g of loadGroups()) for (const c of g.members) m.set(c, g.id)
    return m
  }, [reloadKey])

  // 基础统计（列入镇级/市级按集团折叠计数）
  const total = data.length
  const aboveScale = data.filter(r => r.isAboveScale).length
  const operating = data.filter(r => r.isOperating).length
  const townLevel = countCollapsed(data.filter(r => r.inTownLevel), groupOfCode)
  const cityLevel = countCollapsed(data.filter(r => r.inCityLevel), groupOfCode)

  // 按乡镇汇总（市级/镇级按集团折叠计数）
  const townshipStats = useMemo(() => {
    const map = new Map<string, { total: number; townRecs: ScreeningRecord[]; cityRecs: ScreeningRecord[]; other: number }>()
    for (const r of data) {
      const key = r.township || '未知'
      const s = map.get(key) ?? { total: 0, townRecs: [], cityRecs: [], other: 0 }
      s.total++
      if (r.inTownLevel) s.townRecs.push(r)
      if (r.inCityLevel) s.cityRecs.push(r)
      if (r.inOther) s.other++
      map.set(key, s)
    }
    return Array.from(map.entries())
      .map(([township, s]) => ({ township, total: s.total, other: s.other, town: countCollapsed(s.townRecs, groupOfCode), city: countCollapsed(s.cityRecs, groupOfCode) }))
      .sort((a, b) => b.total - a.total)
  }, [data, groupOfCode])

  // 按行业汇总（市级/镇级按集团折叠计数）
  const industryStats = useMemo(() => {
    const map = new Map<string, { total: number; townRecs: ScreeningRecord[]; cityRecs: ScreeningRecord[]; other: number }>()
    for (const r of data) {
      const key = r.industry || '未知'
      const s = map.get(key) ?? { total: 0, townRecs: [], cityRecs: [], other: 0 }
      s.total++
      if (r.inTownLevel) s.townRecs.push(r)
      if (r.inCityLevel) s.cityRecs.push(r)
      if (r.inOther) s.other++
      map.set(key, s)
    }
    return Array.from(map.entries())
      .map(([industry, s]) => ({ industry, total: s.total, other: s.other, town: countCollapsed(s.townRecs, groupOfCode), city: countCollapsed(s.cityRecs, groupOfCode) }))
      .sort((a, b) => b.total - a.total)
  }, [data, groupOfCode])

  // 有时间节点提醒的企业（按企业聚合：只要存在提醒即列出，已超期的标红高亮）
  const reminderEnterprises = useMemo(() => {
    const all = loadAllReminders()
    const recById = new Map(data.map(r => [r.id, r]))
    const rows: { recordId: string; companyName: string; industry: string; township: string; total: number; overdue: number; nearestDate: string }[] = []
    for (const recordId of Object.keys(all)) {
      const rec = recById.get(recordId)
      if (!rec) continue // 对应企业已不存在（被删除）则不显示
      const nodes = all[recordId]
      if (!nodes.length) continue
      const overdue = nodes.filter(n => isOverdue(n.date)).length
      const nearestDate = [...nodes].map(n => n.date).sort((a, b) => a.localeCompare(b))[0] ?? ''
      rows.push({
        recordId,
        companyName: rec.companyName,
        industry: rec.industry,
        township: rec.township,
        total: nodes.length,
        overdue,
        nearestDate,
      })
    }
    // 有超期的企业排在前面，其次按最近节点时间升序
    return rows.sort((a, b) =>
      (b.overdue > 0 ? 1 : 0) - (a.overdue > 0 ? 1 : 0) || a.nearestDate.localeCompare(b.nearestDate))
  }, [data])

  return (
    <div className='w-full'>
      <div className='border-b'>
        <div className='flex min-h-17 items-center gap-3 px-6 py-3'>
          <span className='text-lg font-medium'>仪表盘</span>
          <div className='ml-auto flex items-center gap-3'>
            <Button size='sm' variant='outline' onClick={handleDownloadTemplate}>
              <DownloadIcon className='size-4' />
              下载模板
            </Button>
            <Button size='sm' onClick={openImport}>
              <UploadIcon className='size-4' />
              一键导入
            </Button>
          </div>
        </div>
      </div>

      <div className='p-6 space-y-6'>
        {/* 时间节点异常提醒企业 */}
        {reminderEnterprises.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <BellIcon className='size-5 text-red-500' />
                时间节点异常提醒
                <Badge className='rounded-full bg-red-100 text-red-700'>{reminderEnterprises.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>企业名称</TableHead>
                    <TableHead>行业</TableHead>
                    <TableHead>乡镇</TableHead>
                    <TableHead>提醒节点</TableHead>
                    <TableHead>最近节点</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reminderEnterprises.map(r => (
                    <TableRow key={r.recordId} className={cn(r.overdue > 0 && 'bg-red-50/50')}>
                      <TableCell className='font-medium max-w-40 truncate'>
                        <Link to={`/app/screening/${r.recordId}`} className='text-primary hover:underline'>{r.companyName}</Link>
                      </TableCell>
                      <TableCell className='text-muted-foreground max-w-24 truncate'>{r.industry}</TableCell>
                      <TableCell className='text-muted-foreground max-w-28 truncate'>{r.township}</TableCell>
                      <TableCell>
                        <span className='inline-flex items-center gap-1.5'>
                          <Badge variant='outline' className='rounded-sm'>{r.total} 个</Badge>
                          {r.overdue > 0 && <Badge className='rounded-sm bg-red-100 text-red-700'>{r.overdue} 超期</Badge>}
                        </span>
                      </TableCell>
                      <TableCell className={cn(r.overdue > 0 ? 'text-red-600' : 'text-muted-foreground')}>{r.nearestDate || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* 统计卡片 */}
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4'>
          <StatCard title='初筛信息条数' value={total} icon={FileTextIcon} color='bg-blue-100 text-blue-600' to='/app/screening' />
          <StatCard title='规上企业' value={aboveScale} icon={FactoryIcon} description={`占比 ${total ? Math.round(aboveScale / total * 100) : 0}%`} color='bg-emerald-100 text-emerald-600' to='/app/screening' />
          <StatCard title='正常运营' value={operating} icon={TrendingUpIcon} description={`占比 ${total ? Math.round(operating / total * 100) : 0}%`} color='bg-green-100 text-green-600' to='/app/screening' />
          <StatCard title='列入镇级' value={townLevel} icon={BuildingIcon} description={`在库 ${townLevel} 家`} color='bg-amber-100 text-amber-600' to='/app/town' />
          <StatCard title='列入市级' value={cityLevel} icon={LandmarkIcon} description={`在库 ${cityLevel} 家`} color='bg-purple-100 text-purple-600' to='/app/city' />
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0'>
          {/* 按乡镇汇总 */}
          <Card className='min-w-0'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Building2Icon className='size-5' />
                按乡镇汇总
              </CardTitle>
            </CardHeader>
            <CardContent className='overflow-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>乡镇</TableHead>
                    <TableHead className='text-right'>初筛条数</TableHead>
                    <TableHead className='text-right'>市级</TableHead>
                    <TableHead className='text-right'>镇级</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {townshipStats.map(s => (
                    <TableRow key={s.township}>
                      <TableCell className='font-medium'>
                        <Link to={`/app/screening?township=${encodeURIComponent(s.township)}`} className='text-primary hover:underline'>
                          {s.township}
                        </Link>
                      </TableCell>
                      <TableCell className='text-right'>
                        <Link to={`/app/screening?township=${encodeURIComponent(s.township)}`} className='text-primary hover:underline'>
                          {s.total}
                        </Link>
                      </TableCell>
                      <TableCell className='text-right'>
                        {s.city > 0 ? (
                          <Link to={`/app/city?township=${encodeURIComponent(s.township)}`}>
                            <Badge variant='outline' className='rounded-sm cursor-pointer hover:bg-muted'>{s.city}</Badge>
                          </Link>
                        ) : '—'}
                      </TableCell>
                      <TableCell className='text-right'>
                        {s.town > 0 ? (
                          <Link to={`/app/town?township=${encodeURIComponent(s.township)}`}>
                            <Badge variant='outline' className='rounded-sm cursor-pointer hover:bg-muted'>{s.town}</Badge>
                          </Link>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {townshipStats.length > 0 && (
                    <TableRow className='font-semibold bg-muted/30'>
                      <TableCell>合计</TableCell>
                      <TableCell className='text-right'>{total}</TableCell>
                      <TableCell className='text-right'>{cityLevel}</TableCell>
                      <TableCell className='text-right'>{townLevel}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 按行业汇总 */}
          <Card className='min-w-0'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <UsersIcon className='size-5' />
                按行业汇总
              </CardTitle>
            </CardHeader>
            <CardContent className='overflow-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>行业</TableHead>
                    <TableHead className='text-right'>初筛条数</TableHead>
                    <TableHead className='text-right'>市级</TableHead>
                    <TableHead className='text-right'>镇级</TableHead>
                    <TableHead className='text-right'>占比</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {industryStats.map(s => (
                    <TableRow key={s.industry}>
                      <TableCell className='font-medium'>
                        <Link to={`/app/screening?industry=${encodeURIComponent(s.industry)}`} className='text-primary hover:underline'>
                          {s.industry}
                        </Link>
                      </TableCell>
                      <TableCell className='text-right'>
                        <Link to={`/app/screening?industry=${encodeURIComponent(s.industry)}`} className='text-primary hover:underline'>
                          {s.total}
                        </Link>
                      </TableCell>
                      <TableCell className='text-right'>
                        {s.city > 0 ? (
                          <Link to={`/app/city?industry=${encodeURIComponent(s.industry)}`}>
                            <Badge variant='outline' className='rounded-sm cursor-pointer hover:bg-muted'>{s.city}</Badge>
                          </Link>
                        ) : '—'}
                      </TableCell>
                      <TableCell className='text-right'>
                        {s.town > 0 ? (
                          <Link to={`/app/town?industry=${encodeURIComponent(s.industry)}`}>
                            <Badge variant='outline' className='rounded-sm cursor-pointer hover:bg-muted'>{s.town}</Badge>
                          </Link>
                        ) : '—'}
                      </TableCell>
                      <TableCell className='text-right text-muted-foreground'>
                        {total ? Math.round(s.total / total * 100) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {industryStats.length > 0 && (
                    <TableRow className='font-semibold bg-muted/30'>
                      <TableCell>合计</TableCell>
                      <TableCell className='text-right'>{total}</TableCell>
                      <TableCell className='text-right'>{cityLevel}</TableCell>
                      <TableCell className='text-right'>{townLevel}</TableCell>
                      <TableCell className='text-right'>100%</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* 一键导入弹窗 */}
      <Dialog open={importOpen} onOpenChange={o => { if (!importing) setImportOpen(o) }}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>一键导入</DialogTitle>
            <DialogDescription>
              导入含「初筛」「市级」「镇级」工作表的 Excel，自动归集到对应模块。可一次选择多个文件。
            </DialogDescription>
          </DialogHeader>

          {/* 拖拽 / 点击上传区 */}
          <div
            role='button'
            tabIndex={0}
            onClick={() => !importing && fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); if (!importing) setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
              importing ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-muted/50',
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            )}
          >
            {importing ? (
              <>
                <Loader2Icon className='size-8 animate-spin text-primary' />
                <p className='text-sm text-muted-foreground'>正在导入，请稍候…</p>
              </>
            ) : (
              <>
                <FileSpreadsheetIcon className='size-8 text-muted-foreground' />
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>点击选择，或将 Excel 文件拖拽到此处</p>
                  <p className='text-xs text-muted-foreground'>支持 .xlsx / .xls，可多选</p>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type='file'
            multiple
            accept='.xlsx,.xls'
            onChange={handleFileChange}
            className='hidden'
          />

          {/* 导入结果 */}
          {importResult && (
            <div className='space-y-2'>
              {importResult.summary && (
                <div className='flex items-start gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700'>
                  <CheckCircle2Icon className='mt-0.5 size-4 shrink-0' />
                  <span>{importResult.summary}</span>
                </div>
              )}
              {importResult.problems.length > 0 && (
                <div className='space-y-1 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700'>
                  <div className='flex items-center gap-2 font-medium'>
                    <AlertCircleIcon className='size-4 shrink-0' />
                    {importResult.summary ? '部分数据已导入，但存在以下问题：' : '导入未生效，原因如下：'}
                  </div>
                  <ul className='ml-6 list-disc space-y-0.5'>
                    {importResult.problems.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant='outline' disabled={importing} onClick={() => setImportOpen(false)}>
              {importResult?.summary ? '完成' : '关闭'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
