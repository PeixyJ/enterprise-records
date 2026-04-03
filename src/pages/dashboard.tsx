import { useMemo } from 'react'
import {
  Building2Icon,
  BuildingIcon,
  LandmarkIcon,
  FileTextIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
  FactoryIcon,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SCREENING_STORAGE_KEY } from '@/db/database'
import { type ScreeningRecord, demoData } from './screening'

// ── 数据加载 ──────────────────────────────────────

function loadData(): ScreeningRecord[] {
  const saved = localStorage.getItem(SCREENING_STORAGE_KEY)
  if (saved) try { return JSON.parse(saved) } catch { /* */ }
  return demoData
}

// ── 统计卡片 ──────────────────────────────────────

function StatCard({ title, value, icon: Icon, description, color }: {
  title: string; value: string | number; icon: React.ElementType; description?: string; color: string
}) {
  return (
    <Card className='py-4'>
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
  const data = useMemo(loadData, [])

  // 基础统计
  const total = data.length
  const aboveScale = data.filter(r => r.isAboveScale).length
  const operating = data.filter(r => r.isOperating).length
  const townLevel = data.filter(r => r.inTownLevel).length
  const cityLevel = data.filter(r => r.inCityLevel).length
  const otherLevel = data.filter(r => r.inOther).length

  // 按乡镇汇总
  const townshipStats = useMemo(() => {
    const map = new Map<string, { total: number; town: number; city: number; other: number; townExit: number; cityExit: number }>()
    for (const r of data) {
      const key = r.township || '未知'
      const s = map.get(key) ?? { total: 0, town: 0, city: 0, other: 0, townExit: 0, cityExit: 0 }
      s.total++
      if (r.inTownLevel) s.town++
      if (r.inCityLevel) s.city++
      if (r.inOther) s.other++
      map.set(key, s)
    }
    return Array.from(map.entries())
      .map(([township, s]) => ({ township, ...s, townInStock: s.town - s.townExit, cityInStock: s.city - s.cityExit }))
      .sort((a, b) => b.total - a.total)
  }, [data])

  // 按行业汇总
  const industryStats = useMemo(() => {
    const map = new Map<string, { total: number; town: number; city: number; other: number }>()
    for (const r of data) {
      const key = r.industry || '未知'
      const s = map.get(key) ?? { total: 0, town: 0, city: 0, other: 0 }
      s.total++
      if (r.inTownLevel) s.town++
      if (r.inCityLevel) s.city++
      if (r.inOther) s.other++
      map.set(key, s)
    }
    return Array.from(map.entries())
      .map(([industry, s]) => ({ industry, ...s }))
      .sort((a, b) => b.total - a.total)
  }, [data])

  // 按信息来源（报送部门）汇总 — 需要从 detail 数据获取
  // 目前用行业分布替代

  return (
    <div className='w-full'>
      <div className='border-b'>
        <div className='flex min-h-17 items-center px-6 py-3'>
          <span className='text-lg font-medium'>仪表盘</span>
        </div>
      </div>

      <div className='p-6 space-y-6'>
        {/* 统计卡片 */}
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'>
          <StatCard title='初筛信息条数' value={total} icon={FileTextIcon} color='bg-blue-100 text-blue-600' />
          <StatCard title='规上企业' value={aboveScale} icon={FactoryIcon} description={`占比 ${total ? Math.round(aboveScale / total * 100) : 0}%`} color='bg-emerald-100 text-emerald-600' />
          <StatCard title='正常运营' value={operating} icon={TrendingUpIcon} description={`占比 ${total ? Math.round(operating / total * 100) : 0}%`} color='bg-green-100 text-green-600' />
          <StatCard title='列入镇级' value={townLevel} icon={BuildingIcon} description={`在库 ${townLevel} 家`} color='bg-amber-100 text-amber-600' />
          <StatCard title='列入市级' value={cityLevel} icon={LandmarkIcon} description={`在库 ${cityLevel} 家`} color='bg-purple-100 text-purple-600' />
          <StatCard title='列入其他' value={otherLevel} icon={FileTextIcon} description={`在库 ${otherLevel} 家`} color='bg-gray-100 text-gray-600' />
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
                    <TableHead className='text-right'>其他</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {townshipStats.map(s => (
                    <TableRow key={s.township}>
                      <TableCell className='font-medium'>{s.township}</TableCell>
                      <TableCell className='text-right'>{s.total}</TableCell>
                      <TableCell className='text-right'>
                        {s.city > 0 ? <Badge variant='outline' className='rounded-sm'>{s.city}</Badge> : '—'}
                      </TableCell>
                      <TableCell className='text-right'>
                        {s.town > 0 ? <Badge variant='outline' className='rounded-sm'>{s.town}</Badge> : '—'}
                      </TableCell>
                      <TableCell className='text-right'>
                        {s.other > 0 ? <Badge variant='outline' className='rounded-sm'>{s.other}</Badge> : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {townshipStats.length > 0 && (
                    <TableRow className='font-semibold bg-muted/30'>
                      <TableCell>合计</TableCell>
                      <TableCell className='text-right'>{total}</TableCell>
                      <TableCell className='text-right'>{cityLevel}</TableCell>
                      <TableCell className='text-right'>{townLevel}</TableCell>
                      <TableCell className='text-right'>{otherLevel}</TableCell>
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
                    <TableHead className='text-right'>其他</TableHead>
                    <TableHead className='text-right'>占比</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {industryStats.map(s => (
                    <TableRow key={s.industry}>
                      <TableCell className='font-medium'>{s.industry}</TableCell>
                      <TableCell className='text-right'>{s.total}</TableCell>
                      <TableCell className='text-right'>
                        {s.city > 0 ? <Badge variant='outline' className='rounded-sm'>{s.city}</Badge> : '—'}
                      </TableCell>
                      <TableCell className='text-right'>
                        {s.town > 0 ? <Badge variant='outline' className='rounded-sm'>{s.town}</Badge> : '—'}
                      </TableCell>
                      <TableCell className='text-right'>
                        {s.other > 0 ? <Badge variant='outline' className='rounded-sm'>{s.other}</Badge> : '—'}
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
                      <TableCell className='text-right'>{otherLevel}</TableCell>
                      <TableCell className='text-right'>100%</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* 异常运营企业列表 */}
        {data.filter(r => !r.isOperating).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <TrendingDownIcon className='size-5 text-red-500' />
                异常运营企业
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>企业名称</TableHead>
                    <TableHead>行业</TableHead>
                    <TableHead>乡镇</TableHead>
                    <TableHead>规上企业</TableHead>
                    <TableHead>上报时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.filter(r => !r.isOperating).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className='font-medium max-w-40 truncate'>{r.companyName}</TableCell>
                      <TableCell className='text-muted-foreground max-w-24 truncate'>{r.industry}</TableCell>
                      <TableCell className='text-muted-foreground max-w-28 truncate'>{r.township}</TableCell>
                      <TableCell>
                        <Badge className={cn('rounded-sm px-1.5', r.isAboveScale
                          ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
                        )}>{r.isAboveScale ? '是' : '否'}</Badge>
                      </TableCell>
                      <TableCell className='text-muted-foreground'>{r.reportDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
