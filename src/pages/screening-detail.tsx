import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  ArrowLeftIcon,
  CheckIcon,
  XIcon,
  HashIcon,
  ActivityIcon,
  BuildingIcon,
  LandmarkIcon,
  PencilIcon,
  BellIcon,
  PlusIcon,
  Trash2Icon,
  AlertTriangleIcon,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { loadScreening, loadDetail, updateScreeningLevels, type StoredDetail } from '@/db/screening-store'
import { type ScreeningRecord, getIndustryIcon } from './screening'
import { loadProgressInfo, type LevelExtra } from './level-table'
import { type TimeNode, loadReminders, saveReminders, newNodeId, isOverdue } from '@/lib/reminders'
import { type LevelEvent, type LevelEventType, LEVEL_EVENT_LABEL, loadLevelEvents, saveLevelEvents, newEventId, eventCategory, isLatestInCategory } from '@/lib/level-timeline'
import { DatePicker } from '@/components/date-picker'

// ── 数据类型 ──────────────────────────────────────

export interface TaxYearData {
  year: string
  revenue: number
  profit: number
  taxPayable: number
  assets: number
  liabilities: number
  debtRatio: number
}

export interface SimpleYearData {
  year: string
  value: number
}

interface ReportLog {
  infoSource: string
  department: string
  warningReason: string
  issueDate: string
  amount: number
  other: string
}

export function toTaxData(detail: StoredDetail | null): TaxYearData[] {
  if (!detail?.tax || detail.tax.length === 0) return []
  return detail.tax
    .filter(t => t.revenue != null || t.profit != null || t.taxPayable != null || t.assets != null || t.liabilities != null || t.debtRatio != null)
    .map(t => ({
      year: String(t.year),
      revenue: t.revenue ?? 0,
      profit: t.profit ?? 0,
      taxPayable: t.taxPayable ?? 0,
      assets: t.assets ?? 0,
      liabilities: t.liabilities ?? 0,
      debtRatio: t.debtRatio ?? 0,
    }))
}

export function toSimpleData(arr?: { year: number; value?: number }[]): SimpleYearData[] {
  if (!arr) return []
  return arr
    .filter(d => d.value != null)
    .map(d => ({ year: String(d.year), value: d.value! }))
}

function toReportLogs(detail: StoredDetail | null): ReportLog[] {
  if (!detail) return []
  const sources = detail.reportSources ?? []
  return sources
    .filter(src => src.department || src.warningReason || src.issueDate || src.amount != null)
    .map(src => ({
      infoSource: src.department ?? '',
      department: src.department ?? '',
      warningReason: src.warningReason ?? '',
      issueDate: src.issueDate ?? '',
      amount: src.amount ?? 0,
      other: src.other ?? '',
    }))
}

// ── 统计小卡片 ──────────────────────────────────────

function StatCard({ icon: IconComponent, label, value, color }: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  color: string
}) {
  return (
    <div className='flex items-center gap-3 rounded-lg border px-4 py-3'>
      <div className={cn('flex size-9 items-center justify-center rounded-lg', color)}>
        <IconComponent className='size-4' />
      </div>
      <div>
        <p className='text-xs text-muted-foreground'>{label}</p>
        <p className='text-sm font-semibold'>{value}</p>
      </div>
    </div>
  )
}

function BoolValue({ value }: { value: boolean }) {
  return value
    ? <span className='flex items-center gap-1 text-green-600'><CheckIcon className='size-3.5' />是</span>
    : <span className='flex items-center gap-1 text-red-500'><XIcon className='size-3.5' />否</span>
}

export function fmt(n: number): string {
  return n.toLocaleString('zh-CN')
}

// ── 编辑按钮 ──────────────────────────────────────

function EditButton({ editing, onEdit, onSave, onCancel }: {
  editing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
}) {
  if (editing) {
    return (
      <div className='flex gap-2'>
        <Button variant='ghost' size='sm' onClick={onCancel}>取消</Button>
        <Button size='sm' onClick={onSave}>保存</Button>
      </div>
    )
  }
  return (
    <Button variant='ghost' size='sm' onClick={onEdit}>
      <PencilIcon className='size-3.5' />
      编辑
    </Button>
  )
}

// ── 主页面 ──────────────────────────────────────────

export default function ScreeningDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/app/screening')
  }
  const allData: ScreeningRecord[] = loadScreening()
  const record = allData.find(r => r.id === id)

  // 编辑状态
  const [editingTab, setEditingTab] = useState<string | null>(null)

  // 从数据库加载该企业的详细数据
  const detail = id ? loadDetail(id) : null

  // 各 Tab 数据状态（使用真实导入数据，无数据则为空数组）
  const [basicData, setBasicData] = useState(() => record ? {
    companyName: record.companyName,
    industry: record.industry,
    township: record.township,
    isAboveScale: record.isAboveScale,
    isOperating: record.isOperating,
    inTownLevel: record.inTownLevel,
    inCityLevel: record.inCityLevel,
    reportDate: record.reportDate,
  } : null)
  const [taxData, setTaxData] = useState(() => toTaxData(detail))
  const [socialData, setSocialData] = useState(() => toSimpleData(detail?.social))
  const [powerData, setPowerData] = useState(() => toSimpleData(detail?.power))
  const [waterData, setWaterData] = useState(() => toSimpleData(detail?.water))
  const [loanData, setLoanData] = useState(() => toSimpleData(detail?.loan))
  const [reportData, setReportData] = useState(() => toReportLogs(detail))
  const [timelineEvents, setTimelineEvents] = useState<LevelEvent[]>(() => id ? loadLevelEvents(id) : [])
  const [newEventType, setNewEventType] = useState<LevelEventType>('joinTown')
  const [newEventDate, setNewEventDate] = useState('')
  const [newEventNote, setNewEventNote] = useState('')
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editEventDate, setEditEventDate] = useState('')
  const [editEventNote, setEditEventNote] = useState('')

  // 编辑草稿
  const [draftBasic, setDraftBasic] = useState(basicData)
  const [draftTax, setDraftTax] = useState(taxData)
  const [draftSimple, setDraftSimple] = useState<SimpleYearData[]>([])
  const [draftReports, setDraftReports] = useState(reportData)

  const persistTimeline = (events: LevelEvent[]) => {
    const sorted = [...events].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    setTimelineEvents(sorted)
    if (id) saveLevelEvents(id, sorted)
  }
  // 若新增节点是同类（镇级/市级）中时间最新的一条，则反向回写企业的「列入镇级/市级」状态；否则不动
  const syncLevelFromEvent = (ev: LevelEvent) => {
    if (!id || !basicData) return
    const category = eventCategory(ev.type)
    if (!isLatestInCategory(timelineEvents, category, ev.date)) return
    const included = ev.type === 'joinTown' || ev.type === 'joinCity'
    if (category === 'town') {
      if (basicData.inTownLevel === included) return
      updateScreeningLevels(id, { inTownLevel: included })
      setBasicData(b => (b ? { ...b, inTownLevel: included } : b))
    } else {
      if (basicData.inCityLevel === included) return
      updateScreeningLevels(id, { inCityLevel: included })
      setBasicData(b => (b ? { ...b, inCityLevel: included } : b))
    }
  }
  const handleAddEvent = () => {
    if (!newEventDate) return
    const ev: LevelEvent = { id: newEventId(), type: newEventType, date: newEventDate, note: newEventNote.trim() || undefined }
    syncLevelFromEvent(ev)
    persistTimeline([...timelineEvents, ev])
    setNewEventDate('')
    setNewEventNote('')
  }
  const handleDeleteEvent = (eventId: string) => {
    persistTimeline(timelineEvents.filter(e => e.id !== eventId))
    if (editingEventId === eventId) setEditingEventId(null)
  }
  const startEditEvent = (e: LevelEvent) => {
    setEditingEventId(e.id)
    setEditEventDate(e.date)
    setEditEventNote(e.note ?? '')
  }
  const saveEditEvent = () => {
    if (!editingEventId || !editEventDate) return
    persistTimeline(timelineEvents.map(e => e.id === editingEventId ? { ...e, date: editEventDate, note: editEventNote.trim() || undefined } : e))
    setEditingEventId(null)
  }
  const [reportDetailLog, setReportDetailLog] = useState<ReportLog | null>(null)

  // 企业进展信息（来自市级/镇级表）
  const progressInfo: LevelExtra | null = record ? loadProgressInfo(record.id, record.creditCode) : null

  // 时间节点提醒
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminders, setReminders] = useState<TimeNode[]>(() => id ? loadReminders(id) : [])
  const [reminderDesc, setReminderDesc] = useState('')
  const [reminderDate, setReminderDate] = useState('')

  const persistReminders = (next: TimeNode[]) => {
    setReminders(next)
    if (id) saveReminders(id, next)
  }
  const handleAddReminder = () => {
    if (!reminderDesc.trim() || !reminderDate) return
    persistReminders([...reminders, { id: newNodeId(), description: reminderDesc.trim(), date: reminderDate }]
      .sort((a, b) => a.date.localeCompare(b.date)))
    setReminderDesc('')
    setReminderDate('')
  }
  const handleDeleteReminder = (nodeId: string) => {
    persistReminders(reminders.filter(n => n.id !== nodeId))
  }
  const overdueCount = reminders.filter(n => isOverdue(n.date)).length

  if (!record || !basicData) {
    return (
      <div className='flex flex-col items-center justify-center gap-4 py-20'>
        <p className='text-muted-foreground'>未找到该企业记录</p>
        <Button variant='outline' onClick={goBack}>
          <ArrowLeftIcon className='size-4' />
          返回
        </Button>
      </div>
    )
  }

  const Icon = getIndustryIcon(basicData.industry)

  function startEdit(tab: string) {
    setEditingTab(tab)
    if (tab === 'basic') setDraftBasic({ ...basicData! })
    if (tab === 'tax') setDraftTax(taxData.map(r => ({ ...r })))
    if (tab === 'social') setDraftSimple(socialData.map(r => ({ ...r })))
    if (tab === 'power') setDraftSimple(powerData.map(r => ({ ...r })))
    if (tab === 'water') setDraftSimple(waterData.map(r => ({ ...r })))
    if (tab === 'finance') setDraftSimple(loanData.map(r => ({ ...r })))
    if (tab === 'reports') setDraftReports(reportData.map(r => ({ ...r })))
  }

  function saveEdit(tab: string) {
    if (tab === 'basic') setBasicData({ ...draftBasic! })
    if (tab === 'tax') setTaxData([...draftTax])
    if (tab === 'social') setSocialData([...draftSimple])
    if (tab === 'power') setPowerData([...draftSimple])
    if (tab === 'water') setWaterData([...draftSimple])
    if (tab === 'finance') setLoanData([...draftSimple])
    if (tab === 'reports') setReportData([...draftReports])
    setEditingTab(null)
  }

  function cancelEdit() {
    setEditingTab(null)
  }

  const isEditing = (tab: string) => editingTab === tab

  return (
    <div className='w-full'>
      <Button variant='ghost' size='sm' className='mb-4' onClick={goBack}>
        <ArrowLeftIcon className='size-4' />
        返回
      </Button>

      {/* 头部信息 */}
      <div className='flex items-start gap-4 mb-6'>
        <Avatar className='size-14'>
          <AvatarFallback className='bg-primary/10 text-primary'>
            <Icon className='size-7' />
          </AvatarFallback>
        </Avatar>
        <div className='flex-1'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h1 className='text-xl font-semibold'>{basicData.companyName}</h1>
            <span className='text-muted-foreground'>·</span>
            <span className='text-muted-foreground'>{basicData.industry}</span>
            <Badge className={cn('rounded-sm px-1.5', basicData.isAboveScale
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-muted text-muted-foreground'
            )}>
              {basicData.isAboveScale ? '规上' : '规下'}
            </Badge>
          </div>
          <div className='flex items-center gap-3 mt-1.5 text-sm text-muted-foreground'>
            <span className='font-mono'>信用代码: {record.creditCode}</span>
            <Separator orientation='vertical' className='h-3.5' />
            <span>乡镇: {basicData.township}</span>
            <Separator orientation='vertical' className='h-3.5' />
            <span>上报时间: {record.reportDate}</span>
          </div>
        </div>
        <Button variant='outline' size='sm' onClick={() => setReminderOpen(true)} className={cn(overdueCount > 0 && 'border-red-300 text-red-600 hover:text-red-700')}>
          <BellIcon className='size-4' />
          时间节点提醒
          {reminders.length > 0 && (
            <Badge className={cn('ml-1 rounded-full px-1.5', overdueCount > 0 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground')}>
              {overdueCount > 0 ? `${overdueCount} 超期` : reminders.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6'>
        <StatCard icon={HashIcon} label='上报次数' value={`${record.reportCount} 次`} color='bg-blue-100 text-blue-600' />
        <StatCard icon={ActivityIcon} label='是否正常运营' value={<BoolValue value={basicData.isOperating} />} color='bg-emerald-100 text-emerald-600' />
        <StatCard icon={BuildingIcon} label='列入镇级' value={<BoolValue value={basicData.inTownLevel} />} color='bg-amber-100 text-amber-600' />
        <StatCard icon={LandmarkIcon} label='列入市级' value={<BoolValue value={basicData.inCityLevel} />} color='bg-purple-100 text-purple-600' />
      </div>

      {/* Tab 区域 */}
      <Tabs defaultValue='basic' className='w-full'>
        <TabsList>
          <TabsTrigger value='basic'>基本信息</TabsTrigger>
          <TabsTrigger value='tax'>税务</TabsTrigger>
          <TabsTrigger value='social'>人社</TabsTrigger>
          <TabsTrigger value='power'>电力</TabsTrigger>
          <TabsTrigger value='water'>水务</TabsTrigger>
          <TabsTrigger value='finance'>金融办</TabsTrigger>
          <TabsTrigger value='reports'>上报记录</TabsTrigger>
          <TabsTrigger value='progress'>企业进展</TabsTrigger>
          <TabsTrigger value='timeline'>镇级/市级时间轴</TabsTrigger>
        </TabsList>

        {/* ── 基本信息 ── */}
        <TabsContent value='basic'>
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardAction>
                <EditButton editing={isEditing('basic')} onEdit={() => startEdit('basic')} onSave={() => saveEdit('basic')} onCancel={cancelEdit} />
              </CardAction>
            </CardHeader>
            <CardContent>
              {isEditing('basic') && draftBasic ? (
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-8'>
                  <FieldStatic label='社会信用代码' value={<span className='font-mono'>{record.creditCode}</span>} />
                  <FieldInput label='企业名称' value={draftBasic.companyName} onChange={v => setDraftBasic({ ...draftBasic, companyName: v })} />
                  <FieldInput label='行业' value={draftBasic.industry} onChange={v => setDraftBasic({ ...draftBasic, industry: v })} />
                  <FieldInput label='街道乡镇' value={draftBasic.township} onChange={v => setDraftBasic({ ...draftBasic, township: v })} />
                  <FieldSwitch label='是否规上企业' checked={draftBasic.isAboveScale} onChange={v => setDraftBasic({ ...draftBasic, isAboveScale: v })} />
                  <FieldSwitch label='是否正常运营' checked={draftBasic.isOperating} onChange={v => setDraftBasic({ ...draftBasic, isOperating: v })} />
                  <FieldSwitch label='列入镇级' checked={draftBasic.inTownLevel} onChange={v => setDraftBasic({ ...draftBasic, inTownLevel: v })} />
                  <FieldSwitch label='列入市级' checked={draftBasic.inCityLevel} onChange={v => setDraftBasic({ ...draftBasic, inCityLevel: v })} />
                  <FieldDate label='上报时间' value={draftBasic.reportDate} onChange={v => setDraftBasic({ ...draftBasic, reportDate: v })} />
                </div>
              ) : (
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-8'>
                  <FieldStatic label='社会信用代码' value={<span className='font-mono'>{record.creditCode}</span>} />
                  <FieldStatic label='企业名称' value={basicData.companyName} />
                  <FieldStatic label='行业' value={basicData.industry} />
                  <FieldStatic label='街道乡镇' value={basicData.township} />
                  <FieldStatic label='是否规上企业' value={basicData.isAboveScale ? '是' : '否'} />
                  <FieldStatic label='是否正常运营' value={<BoolValue value={basicData.isOperating} />} />
                  <FieldStatic label='列入镇级' value={<BoolValue value={basicData.inTownLevel} />} />
                  <FieldStatic label='列入市级' value={<BoolValue value={basicData.inCityLevel} />} />
                  <FieldStatic label='上报时间' value={basicData.reportDate} />
                  <FieldStatic label='上报次数' value={`${record.reportCount} 次`} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 税务 ── */}
        <TabsContent value='tax'>
          <Card>
            <CardHeader>
              <CardTitle>税务数据</CardTitle>
              <CardAction>
                <EditButton editing={isEditing('tax')} onEdit={() => startEdit('tax')} onSave={() => saveEdit('tax')} onCancel={cancelEdit} />
              </CardAction>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>年份</TableHead>
                    <TableHead className='text-right'>营收（万元）</TableHead>
                    <TableHead className='text-right'>利润（万元）</TableHead>
                    <TableHead className='text-right'>应交税金（万元）</TableHead>
                    <TableHead className='text-right'>资产（万元）</TableHead>
                    <TableHead className='text-right'>负债（万元）</TableHead>
                    <TableHead className='text-right'>资产负债率（%）</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(isEditing('tax') ? draftTax : taxData).map((row, i) => (
                    <TableRow key={row.year}>
                      <TableCell className='font-medium'>{row.year}</TableCell>
                      {isEditing('tax') ? (
                        <>
                          <TableCell className='text-right'><NumInput value={row.revenue} onChange={v => { const d = [...draftTax]; d[i] = { ...d[i], revenue: v }; setDraftTax(d) }} /></TableCell>
                          <TableCell className='text-right'><NumInput value={row.profit} onChange={v => { const d = [...draftTax]; d[i] = { ...d[i], profit: v }; setDraftTax(d) }} /></TableCell>
                          <TableCell className='text-right'><NumInput value={row.taxPayable} onChange={v => { const d = [...draftTax]; d[i] = { ...d[i], taxPayable: v }; setDraftTax(d) }} /></TableCell>
                          <TableCell className='text-right'><NumInput value={row.assets} onChange={v => { const d = [...draftTax]; d[i] = { ...d[i], assets: v }; setDraftTax(d) }} /></TableCell>
                          <TableCell className='text-right'><NumInput value={row.liabilities} onChange={v => { const d = [...draftTax]; d[i] = { ...d[i], liabilities: v }; setDraftTax(d) }} /></TableCell>
                          <TableCell className='text-right'><NumInput value={row.debtRatio} onChange={v => { const d = [...draftTax]; d[i] = { ...d[i], debtRatio: v }; setDraftTax(d) }} /></TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className='text-right'>{fmt(row.revenue)}</TableCell>
                          <TableCell className='text-right'>{fmt(row.profit)}</TableCell>
                          <TableCell className='text-right'>{fmt(row.taxPayable)}</TableCell>
                          <TableCell className='text-right'>{fmt(row.assets)}</TableCell>
                          <TableCell className='text-right'>{fmt(row.liabilities)}</TableCell>
                          <TableCell className='text-right'>{row.debtRatio}%</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 人社 ── */}
        <TabsContent value='social'>
          <EditableSimpleCard
            title='人社数据' valueHeader='社保人数（人）'            data={socialData} editing={isEditing('social')} draft={draftSimple} setDraft={setDraftSimple}
            onEdit={() => startEdit('social')} onSave={() => saveEdit('social')} onCancel={cancelEdit}
          />
        </TabsContent>

        {/* ── 电力 ── */}
        <TabsContent value='power'>
          <EditableSimpleCard
            title='电力数据' valueHeader='用电量（千瓦时）'            data={powerData} editing={isEditing('power')} draft={draftSimple} setDraft={setDraftSimple}
            onEdit={() => startEdit('power')} onSave={() => saveEdit('power')} onCancel={cancelEdit}
          />
        </TabsContent>

        {/* ── 水务 ── */}
        <TabsContent value='water'>
          <EditableSimpleCard
            title='水务数据' valueHeader='用水量（吨）'            data={waterData} editing={isEditing('water')} draft={draftSimple} setDraft={setDraftSimple}
            onEdit={() => startEdit('water')} onSave={() => saveEdit('water')} onCancel={cancelEdit}
          />
        </TabsContent>

        {/* ── 金融办 ── */}
        <TabsContent value='finance'>
          <EditableSimpleCard
            title='金融办数据' valueHeader='贷款月均余额（万元）'            data={loanData} editing={isEditing('finance')} draft={draftSimple} setDraft={setDraftSimple}
            onEdit={() => startEdit('finance')} onSave={() => saveEdit('finance')} onCancel={cancelEdit}
          />
        </TabsContent>

        {/* ── 上报记录 ── */}
        <TabsContent value='reports'>
          <Card>
            <CardHeader>
              <CardTitle>上报记录</CardTitle>
              <CardAction>
                <EditButton editing={isEditing('reports')} onEdit={() => startEdit('reports')} onSave={() => saveEdit('reports')} onCancel={cancelEdit} />
              </CardAction>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>信息来源</TableHead>
                    <TableHead>报送部门</TableHead>
                    <TableHead>预警理由</TableHead>
                    <TableHead>问题时间</TableHead>
                    <TableHead className='text-right'>金额（万元）</TableHead>
                    <TableHead>其他信息</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(isEditing('reports') ? draftReports : reportData).map((log, i) => (
                    <TableRow key={i}>
                      {isEditing('reports') ? (
                        <>
                          <TableCell><Input className='w-24' value={log.infoSource} onChange={e => { const d = [...draftReports]; d[i] = { ...d[i], infoSource: e.target.value }; setDraftReports(d) }} /></TableCell>
                          <TableCell><Input className='w-20' value={log.department} onChange={e => { const d = [...draftReports]; d[i] = { ...d[i], department: e.target.value }; setDraftReports(d) }} /></TableCell>
                          <TableCell><Input className='w-48' value={log.warningReason} onChange={e => { const d = [...draftReports]; d[i] = { ...d[i], warningReason: e.target.value }; setDraftReports(d) }} /></TableCell>
                          <TableCell><DatePicker value={log.issueDate} onChange={v => { const d = [...draftReports]; d[i] = { ...d[i], issueDate: v }; setDraftReports(d) }} /></TableCell>
                          <TableCell className='text-right'><NumInput value={log.amount} onChange={v => { const d = [...draftReports]; d[i] = { ...d[i], amount: v }; setDraftReports(d) }} /></TableCell>
                          <TableCell><Input className='w-32' value={log.other} onChange={e => { const d = [...draftReports]; d[i] = { ...d[i], other: e.target.value }; setDraftReports(d) }} /></TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell><Badge variant='outline' className='rounded-sm'>{log.infoSource}</Badge></TableCell>
                          <TableCell>{log.department}</TableCell>
                          <TableCell>
                            <button type='button' className='text-left cursor-pointer hover:text-primary hover:underline' onClick={() => setReportDetailLog(log)}>
                              {log.warningReason
                                ? (log.warningReason.length > 10 ? log.warningReason.slice(0, 10) + '…' : log.warningReason)
                                : '—'}
                            </button>
                          </TableCell>
                          <TableCell className='font-mono text-sm'>{log.issueDate}</TableCell>
                          <TableCell className='text-right'>{fmt(log.amount)}</TableCell>
                          <TableCell className='text-muted-foreground'>{log.other || '—'}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 企业进展 ── */}
        <TabsContent value='progress'>
          <Card>
            <CardHeader>
              <CardTitle>企业进展</CardTitle>
            </CardHeader>
            <CardContent>
              {progressInfo ? (
                <div className='flex flex-col gap-6'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <FieldStatic label='经营情况' value={progressInfo.businessStatus || '—'} />
                    <FieldStatic label='资产情况' value={progressInfo.assetStatus || '—'} />
                    <FieldStatic label='负债情况' value={progressInfo.debtStatus || '—'} />
                    <FieldStatic label='员工情况' value={progressInfo.staffStatus || '—'} />
                    <FieldStatic label='其他需要反馈的情况' value={progressInfo.otherFeedback || '—'} />
                    <FieldStatic label='需要协调的事项' value={progressInfo.coordination || '—'} />
                  </div>
                  <Separator />
                  <div>
                    <h4 className='text-sm font-semibold mb-4'>进展记录</h4>
                    {progressInfo.progress.length > 0 ? (
                      <div className='relative pl-6 border-l-2 border-muted flex flex-col gap-6'>
                        {progressInfo.progress.map((entry, i) => (
                          <div key={i} className='relative'>
                            <div className='absolute -left-[25px] top-1 size-3 rounded-full bg-primary' />
                            <p className='text-xs text-muted-foreground mb-1'>{entry.date}</p>
                            <p className='text-sm mb-1'>{entry.content}</p>
                            {entry.instruction && (
                              <div className='mt-1 rounded-md bg-muted/50 px-3 py-2'>
                                <span className='text-xs text-muted-foreground'>批示：</span>
                                <span className='text-sm'>{entry.instruction}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className='text-sm text-muted-foreground'>暂无进展记录</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className='text-sm text-muted-foreground'>暂无进展信息</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 镇级/市级时间轴 ── */}
        <TabsContent value='timeline'>
          <Card>
            <CardHeader>
              <CardTitle>镇级/市级时间轴</CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* 时间轴 */}
              {timelineEvents.length > 0 ? (
                <div className='relative pl-6 border-l-2 border-muted flex flex-col gap-6'>
                  {timelineEvents.map(e => {
                    const isJoin = e.type === 'joinTown' || e.type === 'joinCity'
                    const editing = editingEventId === e.id
                    return (
                      <div key={e.id} className='relative flex items-start justify-between gap-2'>
                        <div className={cn('absolute -left-[25px] top-2 size-3 rounded-full', isJoin ? 'bg-green-500' : 'bg-gray-400')} />
                        {/* 左侧：永远展示 */}
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2'>
                            <Badge className={cn('rounded-sm px-1.5', isJoin
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                            )}>{LEVEL_EVENT_LABEL[e.type]}</Badge>
                            <span className='text-sm text-muted-foreground'>{e.date}</span>
                          </div>
                          {e.note && <p className='mt-1 text-sm whitespace-pre-wrap'>{e.note}</p>}
                          {/* 编辑区 */}
                          {editing && (
                            <div className='mt-2 flex flex-col gap-2 rounded-md border bg-muted/30 p-3'>
                              <DatePicker value={editEventDate} onChange={setEditEventDate} className='w-40' placeholder='时间' />
                              <Input placeholder='注释（可选）' value={editEventNote} onChange={ev => setEditEventNote(ev.target.value)} />
                              <div className='flex justify-end gap-2'>
                                <Button variant='outline' size='sm' onClick={() => setEditingEventId(null)}>取消</Button>
                                <Button size='sm' onClick={saveEditEvent} disabled={!editEventDate}>保存</Button>
                              </div>
                            </div>
                          )}
                        </div>
                        {/* 右侧：编辑 + 删除 */}
                        <div className='flex items-center gap-1'>
                          <Button variant='ghost' size='icon' className='size-8' onClick={() => startEditEvent(e)}>
                            <PencilIcon className='size-4' />
                          </Button>
                          <Button variant='ghost' size='icon' className='size-8 text-red-500 hover:text-red-700 hover:bg-red-50' onClick={() => handleDeleteEvent(e.id)}>
                            <Trash2Icon className='size-4' />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className='text-sm text-muted-foreground'>暂无时间节点。切换初筛表的「列入镇级/市级」会自动记录，也可在下方手动添加。</p>
              )}

              {/* 手动添加 */}
              <div className='border-t pt-4 space-y-2'>
                <Label>手动添加节点</Label>
                <div className='flex flex-wrap gap-2'>
                  <Select value={newEventType} onValueChange={v => setNewEventType(v as LevelEventType)}>
                    <SelectTrigger className='w-36'><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='joinTown'>加入镇级</SelectItem>
                      <SelectItem value='leaveTown'>离开镇级</SelectItem>
                      <SelectItem value='joinCity'>加入市级</SelectItem>
                      <SelectItem value='leaveCity'>离开市级</SelectItem>
                    </SelectContent>
                  </Select>
                  <DatePicker value={newEventDate} onChange={setNewEventDate} className='w-40' placeholder='时间' />
                  <Input placeholder='注释（可选）' className='flex-1 min-w-40' value={newEventNote} onChange={e => setNewEventNote(e.target.value)} />
                  <Button onClick={handleAddEvent} disabled={!newEventDate}>
                    <PlusIcon className='size-4' />
                    添加
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 时间节点提醒弹窗 */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>时间节点提醒</DialogTitle>
            <DialogDescription>为该企业添加多个时间节点，超过当前时间的节点将高亮提醒。</DialogDescription>
          </DialogHeader>
          <div className='py-2 space-y-4'>
            {/* 已有节点列表 */}
            <div className='max-h-64 overflow-y-auto rounded-md border divide-y'>
              {reminders.length > 0 ? reminders.map(node => {
                const overdue = isOverdue(node.date)
                return (
                  <div key={node.id} className={cn('flex items-center gap-3 px-3 py-2', overdue && 'bg-red-50')}>
                    <div className='flex-1 min-w-0'>
                      <p className={cn('text-sm font-medium truncate', overdue && 'text-red-700')}>{node.description}</p>
                      <p className={cn('text-xs', overdue ? 'text-red-600' : 'text-muted-foreground')}>
                        {node.date}{overdue && <span className='ml-2 inline-flex items-center gap-1'><AlertTriangleIcon className='size-3' />已超期</span>}
                      </p>
                    </div>
                    <Button variant='ghost' size='icon' className='size-8 text-red-500 hover:text-red-700 hover:bg-red-50' onClick={() => handleDeleteReminder(node.id)}>
                      <Trash2Icon className='size-4' />
                    </Button>
                  </div>
                )
              }) : (
                <p className='px-3 py-6 text-sm text-muted-foreground text-center'>暂无时间节点</p>
              )}
            </div>
            {/* 添加新节点 */}
            <div className='space-y-2'>
              <Label>添加时间节点</Label>
              <div className='flex gap-2'>
                <Input placeholder='描述' value={reminderDesc} onChange={e => setReminderDesc(e.target.value)} />
                <DatePicker value={reminderDate} onChange={setReminderDate} className='w-40' placeholder='时间' />
                <Button onClick={handleAddReminder} disabled={!reminderDesc.trim() || !reminderDate}>
                  <PlusIcon className='size-4' />
                  添加
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setReminderOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 上报信息详情弹窗 */}
      <Dialog open={reportDetailLog !== null} onOpenChange={open => { if (!open) setReportDetailLog(null) }}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>上报信息详情</DialogTitle>
            <DialogDescription className='sr-only'>查看完整的上报记录信息</DialogDescription>
          </DialogHeader>
          {reportDetailLog && (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 py-2'>
              <FieldStatic label='信息来源' value={reportDetailLog.infoSource || '—'} />
              <FieldStatic label='报送部门' value={reportDetailLog.department || '—'} />
              <FieldStatic label='问题时间' value={reportDetailLog.issueDate || '—'} />
              <FieldStatic label='金额（万元）' value={fmt(reportDetailLog.amount)} />
              <div className='sm:col-span-2'>
                <FieldStatic label='预警理由' value={<span className='whitespace-pre-wrap'>{reportDetailLog.warningReason || '—'}</span>} />
              </div>
              <div className='sm:col-span-2'>
                <FieldStatic label='其他信息' value={<span className='whitespace-pre-wrap'>{reportDetailLog.other || '—'}</span>} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setReportDetailLog(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── 子组件 ──────────────────────────────────────────

function FieldStatic({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className='flex flex-col gap-1'>
      <span className='text-sm text-muted-foreground'>{label}</span>
      <span className='text-sm font-medium'>{value}</span>
    </div>
  )
}

function FieldInput({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className='flex flex-col gap-1.5'>
      <Label className='text-sm text-muted-foreground'>{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function FieldDate({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className='flex flex-col gap-1.5'>
      <Label className='text-sm text-muted-foreground'>{label}</Label>
      <DatePicker value={value} onChange={onChange} className='w-full' />
    </div>
  )
}

function FieldSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className='flex flex-col gap-1.5'>
      <Label className='text-sm text-muted-foreground'>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Input
      type='number'
      className='w-24 text-right'
      value={value}
      onChange={e => onChange(Number(e.target.value) || 0)}
    />
  )
}

function EditableSimpleCard({ title, valueHeader, data, editing, draft, setDraft, onEdit, onSave, onCancel }: {
  title: string
  valueHeader: string
  data: SimpleYearData[]
  editing: boolean
  draft: SimpleYearData[]
  setDraft: React.Dispatch<React.SetStateAction<SimpleYearData[]>>
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
}) {
  const rows = editing ? draft : data
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction>
          <EditButton editing={editing} onEdit={onEdit} onSave={onSave} onCancel={onCancel} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>年份</TableHead>
              <TableHead className='text-right'>{valueHeader}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={row.year}>
                <TableCell className='font-medium'>{row.year}</TableCell>
                <TableCell className='text-right'>
                  {editing
                    ? <NumInput value={row.value} onChange={v => { const d = [...draft]; d[i] = { ...d[i], value: v }; setDraft(d) }} />
                    : fmt(row.value)
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
