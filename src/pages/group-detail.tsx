import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { ArrowLeftIcon, LayersIcon } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { SCREENING_STORAGE_KEY } from '@/db/database'
import { type ScreeningRecord, demoData, getIndustryIcon } from './screening'
import { loadGroups, loadProgressInfo } from './level-table'
import { loadDetailData, toTaxData, toSimpleData, fmt, type SimpleYearData } from './screening-detail'

function loadAllScreening(): ScreeningRecord[] {
  const saved = localStorage.getItem(SCREENING_STORAGE_KEY)
  if (saved) try { return JSON.parse(saved) } catch { /* */ }
  return demoData
}

// 把中文日期 "2026年3月15日" 或 ISO 日期转为可排序数值
function dateKey(s: string): number {
  const m = s.match(/(\d+)年(\d+)月(\d+)日/)
  if (m) return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3])
  const t = Date.parse(s)
  return Number.isNaN(t) ? 0 : t
}

interface MergedProgress {
  companyName: string
  recordId: string
  date: string
  content: string
  instruction: string
}

export default function GroupDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/app/city')
  }
  const group = useMemo(() => loadGroups().find(g => g.id === id) ?? null, [id])

  const recordByCode = useMemo(() => {
    const m = new Map<string, ScreeningRecord>()
    for (const r of loadAllScreening()) if (r.creditCode) m.set(r.creditCode, r)
    return m
  }, [])

  const members = useMemo(() => {
    if (!group) return [] as ScreeningRecord[]
    return group.members.map(code => recordByCode.get(code)).filter((r): r is ScreeningRecord => !!r)
  }, [group, recordByCode])

  // 合并所有成员企业的进展，标注所属公司
  const mergedProgress = useMemo<MergedProgress[]>(() => {
    if (!group) return []
    const out: MergedProgress[] = []
    for (const code of group.members) {
      const rec = recordByCode.get(code)
      if (!rec) continue
      const info = loadProgressInfo(rec.id, rec.creditCode)
      for (const p of info.progress) {
        out.push({ companyName: rec.companyName, recordId: rec.id, date: p.date, content: p.content, instruction: p.instruction })
      }
    }
    return out.sort((a, b) => dateKey(b.date) - dateKey(a.date))
  }, [group, recordByCode])

  const [selectedCode, setSelectedCode] = useState('')
  const effectiveCode = selectedCode || (members[0]?.creditCode ?? '')
  const selectedRecord = effectiveCode ? recordByCode.get(effectiveCode) : undefined
  const detail = selectedRecord ? loadDetailData(selectedRecord.id) : null
  const taxData = toTaxData(detail)
  const socialData = toSimpleData(detail?.social)
  const powerData = toSimpleData(detail?.power)
  const waterData = toSimpleData(detail?.water)
  const loanData = toSimpleData(detail?.loan)

  if (!group) {
    return (
      <div className='w-full'>
        <Button variant='ghost' size='sm' className='mb-4' onClick={goBack}>
          <ArrowLeftIcon className='size-4' />返回
        </Button>
        <p className='text-muted-foreground'>未找到该集团</p>
      </div>
    )
  }

  return (
    <div className='w-full'>
      <Button variant='ghost' size='sm' className='mb-4' asChild>
        <Link to='/app/city'><ArrowLeftIcon className='size-4' />返回</Link>
      </Button>

      {/* 头部 */}
      <div className='flex items-start gap-4 mb-6'>
        <Avatar className='size-14'>
          <AvatarFallback className='bg-amber-100 text-amber-700'>
            <LayersIcon className='size-6' />
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className='text-xl font-semibold'>{group.name}</h1>
          <p className='text-sm text-muted-foreground'>集团 · 共 {group.members.length} 家成员企业</p>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* 成员企业 */}
        <Card>
          <CardHeader>
            <CardTitle>成员企业</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>企业名称</TableHead>
                  <TableHead>行业</TableHead>
                  <TableHead>街道乡镇</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.members.map(code => {
                  const rec = recordByCode.get(code)
                  const Icon = rec ? getIndustryIcon(rec.industry) : LayersIcon
                  return (
                    <TableRow key={code}>
                      <TableCell>
                        {rec ? (
                          <Link to={`/app/screening/${rec.id}`} className='flex items-center gap-2 hover:underline'>
                            <Avatar className='size-7'>
                              <AvatarFallback className='bg-primary/10 text-primary'><Icon className='size-3.5' /></AvatarFallback>
                            </Avatar>
                            <span className='font-medium'>{rec.companyName}</span>
                          </Link>
                        ) : <span className='text-muted-foreground'>未知企业（{code}）</span>}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>{rec?.industry ?? '—'}</TableCell>
                      <TableCell className='text-muted-foreground'>{rec?.township ?? '—'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 合并进展 */}
        <Card>
          <CardHeader>
            <CardTitle>企业进展（合并）</CardTitle>
          </CardHeader>
          <CardContent>
            {mergedProgress.length > 0 ? (
              <div className='relative pl-6 border-l-2 border-muted flex flex-col gap-6'>
                {mergedProgress.map((entry, i) => (
                  <div key={i} className='relative'>
                    <div className='absolute -left-[25px] top-1 size-3 rounded-full bg-primary' />
                    <div className='flex items-center gap-2 mb-1'>
                      <span className='text-xs font-medium text-primary'>{entry.companyName}</span>
                      <span className='text-xs text-muted-foreground'>{entry.date}</span>
                    </div>
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
          </CardContent>
        </Card>
      </div>

      {/* 各部门数据 */}
      <Card className='mt-6'>
        <CardHeader className='flex flex-row items-center justify-between'>
          <CardTitle>部门数据</CardTitle>
          <Select value={effectiveCode} onValueChange={setSelectedCode}>
            <SelectTrigger className='w-56'>
              <SelectValue placeholder='选择企业' />
            </SelectTrigger>
            <SelectContent>
              {members.map(r => (
                <SelectItem key={r.creditCode} value={r.creditCode}>{r.companyName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {selectedRecord ? (
            <div className='flex flex-col gap-8'>
              {/* 税务 */}
              <div>
                <h4 className='text-sm font-semibold mb-3'>税务</h4>
                {taxData.length > 0 ? (
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
                      {taxData.map(row => (
                        <TableRow key={row.year}>
                          <TableCell>{row.year}</TableCell>
                          <TableCell className='text-right'>{fmt(row.revenue)}</TableCell>
                          <TableCell className='text-right'>{fmt(row.profit)}</TableCell>
                          <TableCell className='text-right'>{fmt(row.taxPayable)}</TableCell>
                          <TableCell className='text-right'>{fmt(row.assets)}</TableCell>
                          <TableCell className='text-right'>{fmt(row.liabilities)}</TableCell>
                          <TableCell className='text-right'>{fmt(row.debtRatio)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className='text-sm text-muted-foreground'>暂无数据</p>}
              </div>
              <Separator />
              <SimpleTable title='人社数据' valueHeader='社保人数（人）' data={socialData} />
              <Separator />
              <SimpleTable title='电力数据' valueHeader='用电量（千瓦时）' data={powerData} />
              <Separator />
              <SimpleTable title='水务数据' valueHeader='用水量（吨）' data={waterData} />
              <Separator />
              <SimpleTable title='金融办数据' valueHeader='贷款月均余额（万元）' data={loanData} />
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>请选择企业</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SimpleTable({ title, valueHeader, data }: { title: string; valueHeader: string; data: SimpleYearData[] }) {
  return (
    <div>
      <h4 className='text-sm font-semibold mb-3'>{title}</h4>
      {data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>年份</TableHead>
              <TableHead className='text-right'>{valueHeader}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(row => (
              <TableRow key={row.year}>
                <TableCell>{row.year}</TableCell>
                <TableCell className='text-right'>{fmt(row.value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : <p className='text-sm text-muted-foreground'>暂无数据</p>}
    </div>
  )
}
