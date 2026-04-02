import { useState } from 'react'
import { useParams, Link } from 'react-router'
import {
  ArrowLeftIcon,
  CheckIcon,
  XIcon,
  HashIcon,
  ActivityIcon,
  BuildingIcon,
  LandmarkIcon,
  PencilIcon,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { SCREENING_STORAGE_KEY, SCREENING_DETAIL_KEY } from '@/db/database'
import { type ScreeningRecord, demoData, getIndustryIcon } from './screening'

// ── 数据类型 ──────────────────────────────────────

interface TaxYearData {
  year: string
  revenue: number
  profit: number
  taxPayable: number
  assets: number
  liabilities: number
  debtRatio: number
}

interface SimpleYearData {
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

// 从 localStorage 加载导入时保存的详细数据
interface StoredDetail {
  tax?: { year: number; revenue?: number; profit?: number; taxPayable?: number; assets?: number; liabilities?: number; debtRatio?: number }[]
  social?: { year: number; value?: number }[]
  power?: { year: number; value?: number }[]
  water?: { year: number; value?: number }[]
  loan?: { year: number; value?: number }[]
  reportSource?: { department?: string; warningReason?: string; issueDate?: string; amount?: number; other?: string }
}

function loadDetailData(id: string): StoredDetail | null {
  const saved = localStorage.getItem(SCREENING_DETAIL_KEY)
  if (!saved) return null
  try {
    const all = JSON.parse(saved)
    return all[id] ?? null
  } catch { return null }
}

function toTaxData(detail: StoredDetail | null): TaxYearData[] {
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

function toSimpleData(arr?: { year: number; value?: number }[]): SimpleYearData[] {
  if (!arr) return []
  return arr
    .filter(d => d.value != null)
    .map(d => ({ year: String(d.year), value: d.value! }))
}

function toReportLogs(detail: StoredDetail | null): ReportLog[] {
  if (!detail?.reportSource) return []
  const src = detail.reportSource
  if (!src.department && !src.warningReason && !src.issueDate && src.amount == null) return []
  return [{
    infoSource: src.department ?? '',
    department: src.department ?? '',
    warningReason: src.warningReason ?? '',
    issueDate: src.issueDate ?? '',
    amount: src.amount ?? 0,
    other: src.other ?? '',
  }]
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

function fmt(n: number): string {
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
  const allData: ScreeningRecord[] = (() => {
    const saved = localStorage.getItem(SCREENING_STORAGE_KEY)
    if (saved) try { return JSON.parse(saved) } catch { /* */ }
    return demoData
  })()
  const record = allData.find(r => r.id === id)

  // 编辑状态
  const [editingTab, setEditingTab] = useState<string | null>(null)

  // 从 localStorage 加载该企业的详细数据
  const detail = id ? loadDetailData(id) : null

  // 各 Tab 数据状态（使用真实导入数据，无数据则为空数组）
  const [basicData, setBasicData] = useState(() => record ? {
    companyName: record.companyName,
    industry: record.industry,
    township: record.township,
    isAboveScale: record.isAboveScale,
    isOperating: record.isOperating,
    inTownLevel: record.inTownLevel,
    inCityLevel: record.inCityLevel,
  } : null)
  const [taxData, setTaxData] = useState(() => toTaxData(detail))
  const [socialData, setSocialData] = useState(() => toSimpleData(detail?.social))
  const [powerData, setPowerData] = useState(() => toSimpleData(detail?.power))
  const [waterData, setWaterData] = useState(() => toSimpleData(detail?.water))
  const [loanData, setLoanData] = useState(() => toSimpleData(detail?.loan))
  const [reportData, setReportData] = useState(() => toReportLogs(detail))

  // 编辑草稿
  const [draftBasic, setDraftBasic] = useState(basicData)
  const [draftTax, setDraftTax] = useState(taxData)
  const [draftSimple, setDraftSimple] = useState<SimpleYearData[]>([])
  const [draftReports, setDraftReports] = useState(reportData)

  if (!record || !basicData) {
    return (
      <div className='flex flex-col items-center justify-center gap-4 py-20'>
        <p className='text-muted-foreground'>未找到该企业记录</p>
        <Button variant='outline' asChild>
          <Link to='/app/screening'>
            <ArrowLeftIcon className='size-4' />
            返回初筛表
          </Link>
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
      <Button variant='ghost' size='sm' className='mb-4' asChild>
        <Link to='/app/screening'>
          <ArrowLeftIcon className='size-4' />
          返回初筛表
        </Link>
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
                  <FieldStatic label='上报时间' value={record.reportDate} />
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
                          <TableCell><Input type='date' className='w-36' value={log.issueDate} onChange={e => { const d = [...draftReports]; d[i] = { ...d[i], issueDate: e.target.value }; setDraftReports(d) }} /></TableCell>
                          <TableCell className='text-right'><NumInput value={log.amount} onChange={v => { const d = [...draftReports]; d[i] = { ...d[i], amount: v }; setDraftReports(d) }} /></TableCell>
                          <TableCell><Input className='w-32' value={log.other} onChange={e => { const d = [...draftReports]; d[i] = { ...d[i], other: e.target.value }; setDraftReports(d) }} /></TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell><Badge variant='outline' className='rounded-sm'>{log.infoSource}</Badge></TableCell>
                          <TableCell>{log.department}</TableCell>
                          <TableCell className='max-w-48'>{log.warningReason}</TableCell>
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
      </Tabs>
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

function FieldInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className='flex flex-col gap-1.5'>
      <Label className='text-sm text-muted-foreground'>{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} />
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
