'use client'

import { useRef, useMemo, useState } from 'react'
import { Link } from 'react-router'

import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  EllipsisVerticalIcon,
  SearchIcon,
  UploadIcon,
  DownloadIcon,
  RefreshCwIcon,
} from 'lucide-react'

import type { ColumnDef, ColumnFiltersState, PaginationState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getPaginationRowModel,
  getFacetedUniqueValues,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

import { usePagination } from '@/hooks/use-pagination'
import { getIndustries, getTownships } from '@/db/dict'
import { SCREENING_STORAGE_KEY } from '@/db/database'
import { type ScreeningRecord, demoData, getIndustryIcon } from './screening'
import { importLevelExcel, exportLevelAll, exportLevelZip, exportLevelQuestionnaire } from '@/lib/excel'

// ── 扩展记录类型 ──────────────────────────────────

export type LevelStatus = '正常' | '新增' | '办结退出'

export interface LevelRecord {
  id: string
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
  progress: ProgressEntry[]
  status: LevelStatus
}

export interface ProgressEntry {
  date: string
  content: string
  instruction: string
}

// ── Demo 扩展数据 ──────────────────────────────────

const demoExtras: Record<string, Omit<LevelRecord, 'id' | 'creditCode' | 'companyName' | 'industry' | 'township' | 'status'>> = {
  '1': {
    businessStatus: '正常经营，业务量同比增长15%',
    assetStatus: '总资产5200万元，固定资产占比40%',
    debtStatus: '负债2100万元，资产负债率40.4%',
    staffStatus: '在职员工86人，近半年新增12人',
    otherFeedback: '计划申请高新技术企业认定',
    coordination: '需协调用地审批问题',
    progress: [
      { date: '2026年3月15日', content: '已完成季度纳税申报，营收稳步增长', instruction: '继续关注企业发展动态' },
      { date: '2026年2月1日', content: '企业扩产项目已获批，预计下半年投产', instruction: '协调相关部门加快审批' },
    ],
  },
  '2': {
    businessStatus: '正常经营，零售业务平稳',
    assetStatus: '总资产1200万元，库存占比30%',
    debtStatus: '负债450万元，资产负债率37.5%',
    staffStatus: '在职员工32人',
    otherFeedback: '无',
    coordination: '无',
    progress: [
      { date: '2026年3月18日', content: '季度经营数据已上报', instruction: '知悉' },
    ],
  },
  '3': {
    businessStatus: '正常经营，在建项目3个',
    assetStatus: '总资产8500万元，在建工程占比35%',
    debtStatus: '负债3200万元，资产负债率37.6%',
    staffStatus: '在职员工210人，含项目经理15人',
    otherFeedback: '部分项目受原材料价格影响，成本上升',
    coordination: '需协调建筑材料供应和运输通道',
    progress: [
      { date: '2026年3月20日', content: '新城区商业综合体项目主体完工', instruction: '加快后续装修进度' },
      { date: '2026年1月15日', content: '中标市政道路改造工程', instruction: '确保工程质量和安全' },
    ],
  },
  '5': {
    businessStatus: '正常经营，运力充足',
    assetStatus: '总资产3600万元，运输车辆占比60%',
    debtStatus: '负债1500万元，资产负债率41.7%',
    staffStatus: '在职员工98人，司机65人',
    otherFeedback: '计划拓展冷链物流业务',
    coordination: '需协调物流园区场地',
    progress: [
      { date: '2026年3月25日', content: '新增5辆冷链运输车', instruction: '支持企业转型升级' },
    ],
  },
  '7': {
    businessStatus: '正常经营，产能利用率92%',
    assetStatus: '总资产1.2亿元，设备资产占比55%',
    debtStatus: '负债4500万元，资产负债率37.5%',
    staffStatus: '在职员工356人，研发人员占比28%',
    otherFeedback: '正在研发下一代芯片封装技术',
    coordination: '需协调人才引进政策落地',
    progress: [
      { date: '2026年3月27日', content: '新产线调试完成，正式投入量产', instruction: '关注产品良率指标' },
      { date: '2026年2月20日', content: '获得省级专精特新企业认定', instruction: '给予配套政策支持' },
    ],
  },
  '8': {
    businessStatus: '经营困难，市场需求不足',
    assetStatus: '总资产800万元，土地占比70%',
    debtStatus: '负债350万元，资产负债率43.8%',
    staffStatus: '在职员工18人，季节性用工较多',
    otherFeedback: '希望获得农业补贴政策支持',
    coordination: '需协调农产品销售渠道',
    progress: [
      { date: '2026年3月28日', content: '提交农业补贴申请材料', instruction: '按政策审核办理' },
    ],
  },
  '9': {
    businessStatus: '正常经营，订单量饱和',
    assetStatus: '总资产6800万元，生产设备占比50%',
    debtStatus: '负债2800万元，资产负债率41.2%',
    staffStatus: '在职员工145人，技术工人占比60%',
    otherFeedback: '计划引进数控加工中心扩大产能',
    coordination: '需协调厂房扩建用地指标',
    progress: [
      { date: '2026年3月29日', content: '完成设备升级改造，效率提升20%', instruction: '总结经验推广至同行业' },
      { date: '2026年2月10日', content: '通过ISO9001质量管理体系复审', instruction: '持续保持质量标准' },
    ],
  },
}

const defaultExtra: Omit<LevelRecord, 'id' | 'creditCode' | 'companyName' | 'industry' | 'township' | 'status'> = {
  businessStatus: '—', assetStatus: '—', debtStatus: '—', staffStatus: '—',
  otherFeedback: '—', coordination: '—', progress: [],
}

function deriveStatus(progress: ProgressEntry[]): LevelStatus {
  if (progress.length === 0) return '正常'
  // 检查最新一条进展
  const latest = progress[progress.length - 1]
  const text = (latest.content + ' ' + latest.instruction).toLowerCase()
  if (text.includes('办结退出') || text.includes('退出')) return '办结退出'
  if (text.includes('新增')) return '新增'
  // 也检查所有进展，以最新出现的状态为准
  for (let i = progress.length - 1; i >= 0; i--) {
    const t = (progress[i].content + ' ' + progress[i].instruction)
    if (t.includes('办结退出') || t.includes('退出')) return '办结退出'
    if (t.includes('新增')) return '新增'
  }
  return '正常'
}

function loadScreeningData(): ScreeningRecord[] {
  const saved = localStorage.getItem(SCREENING_STORAGE_KEY)
  if (saved) {
    try { return JSON.parse(saved) } catch { /* fall through */ }
  }
  return demoData
}

function toLevelRecords(records: ScreeningRecord[], filterKey: 'inCityLevel' | 'inTownLevel'): LevelRecord[] {
  return records
    .filter(r => r[filterKey])
    .map(r => {
      const extra = demoExtras[r.id] ?? defaultExtra
      return {
        id: r.id, creditCode: r.creditCode, companyName: r.companyName,
        industry: r.industry, township: r.township,
        ...extra,
        status: deriveStatus(extra.progress),
      }
    })
}

// ── 列定义 ──────────────────────────────────────────

function createColumns(onViewProgress: (record: LevelRecord) => void, onViewDetail: (label: string, value: string) => void, onViewCompany: (record: LevelRecord) => void): ColumnDef<LevelRecord>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={value => table.toggleAllRowsSelected(!!value)}
          aria-label='全选'
        />
      ),
      cell: ({ row }) => (
        <Checkbox checked={row.getIsSelected()} onCheckedChange={value => row.toggleSelected(!!value)} aria-label='选择行' />
      ),
      size: 50,
    },
    {
      header: '信用代码',
      accessorKey: 'creditCode',
      cell: ({ row }) => (
        <Link to={`/app/screening/${row.original.id}`} className='font-mono text-sm text-primary hover:underline'>
          {row.getValue('creditCode')}
        </Link>
      ),
    },
    {
      header: '企业名称',
      accessorKey: 'companyName',
      cell: ({ row }) => {
        const Icon = getIndustryIcon(row.original.industry)
        const status = row.original.status
        return (
          <div className='flex items-center gap-2'>
            <button type='button' className='flex items-center gap-2 hover:underline cursor-pointer text-left' onClick={() => onViewCompany(row.original)}>
              <Avatar className='size-8'>
                <AvatarFallback className='bg-primary/10 text-primary'>
                  <Icon className='size-4' />
                </AvatarFallback>
              </Avatar>
              <div className='flex flex-col'>
                <span className='font-medium'>{row.getValue('companyName')}</span>
                <span className='text-xs text-muted-foreground'>{row.original.industry}</span>
              </div>
            </button>
            {status === '新增' && (
              <Badge className='rounded-sm px-1.5 bg-blue-100 text-blue-700 border-blue-200'>新增</Badge>
            )}
            {status === '办结退出' && (
              <Badge className='rounded-sm px-1.5 bg-gray-100 text-gray-500 border-gray-200'>办结退出</Badge>
            )}
          </div>
        )
      },
    },
    {
      header: '乡镇街道', accessorKey: 'township',
      cell: ({ row }) => <span className='text-muted-foreground'>{row.getValue('township')}</span>,
    },
    {
      header: '经营情况', accessorKey: 'businessStatus',
      cell: ({ row }) => <button type='button' className='text-sm max-w-40 truncate block text-left cursor-pointer hover:text-primary' onClick={() => onViewDetail('经营情况', row.getValue('businessStatus'))}>{row.getValue('businessStatus')}</button>,
    },
    {
      header: '资产情况', accessorKey: 'assetStatus',
      cell: ({ row }) => <button type='button' className='text-sm max-w-40 truncate block text-left cursor-pointer hover:text-primary' onClick={() => onViewDetail('资产情况', row.getValue('assetStatus'))}>{row.getValue('assetStatus')}</button>,
    },
    {
      header: '负债情况', accessorKey: 'debtStatus',
      cell: ({ row }) => <button type='button' className='text-sm max-w-40 truncate block text-left cursor-pointer hover:text-primary' onClick={() => onViewDetail('负债情况', row.getValue('debtStatus'))}>{row.getValue('debtStatus')}</button>,
    },
    {
      header: '员工情况', accessorKey: 'staffStatus',
      cell: ({ row }) => <button type='button' className='text-sm max-w-40 truncate block text-left cursor-pointer hover:text-primary' onClick={() => onViewDetail('员工情况', row.getValue('staffStatus'))}>{row.getValue('staffStatus')}</button>,
    },
    {
      id: 'actions', header: '进展', enableSorting: false,
      cell: ({ row }) => (
        <Button variant='outline' size='sm' onClick={() => onViewProgress(row.original)}>
          查看进展
        </Button>
      ),
    },
  ]
}

// ── 通用级别表组件 ──────────────────────────────────

const LEVEL_STORAGE_PREFIX = 'enterprise-records-level-'

export default function LevelTable({ title, filterKey }: {
  title: string
  filterKey: 'inCityLevel' | 'inTownLevel'
}) {
  const pageSize = 8
  const storageKey = LEVEL_STORAGE_PREFIX + filterKey

  const baseData = useMemo(() => toLevelRecords(loadScreeningData(), filterKey), [filterKey])

  // 从 localStorage 加载导入的扩展数据，合并到 baseData
  const [importedExtras, setImportedExtras] = useState<Record<string, Partial<LevelRecord>>>(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) try { return JSON.parse(saved) } catch { /* */ }
    return {}
  })

  const data = useMemo(() => baseData.map(r => {
    const extra = importedExtras[r.creditCode]
    if (!extra) return r
    const merged = { ...r, ...extra, id: r.id, creditCode: r.creditCode }
    merged.status = deriveStatus(merged.progress)
    return merged
  }), [baseData, importedExtras])

  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const industries = getIndustries()
  const townships = getTownships()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importCount, setImportCount] = useState<number | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportDate, setExportDate] = useState('')
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false)
  const [qReportDate, setQReportDate] = useState('')
  const [qDeadline, setQDeadline] = useState('')

  const [progressOpen, setProgressOpen] = useState(false)
  const [progressRecord, setProgressRecord] = useState<LevelRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLabel, setDetailLabel] = useState('')
  const [detailValue, setDetailValue] = useState('')

  const handleViewProgress = (record: LevelRecord) => {
    setProgressRecord(record)
    setProgressOpen(true)
  }

  const handleViewDetail = (label: string, value: string) => {
    setDetailLabel(label)
    setDetailValue(value)
    setDetailOpen(true)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await importLevelExcel(file)
      const newExtras = { ...importedExtras }
      let count = 0
      for (const rec of imported) {
        // 按信用代码关联，或按企业名称关联
        const match = baseData.find(r => (rec.creditCode && r.creditCode === rec.creditCode) || r.companyName === rec.companyName)
        if (match) {
          newExtras[match.creditCode] = {
            businessStatus: rec.businessStatus || match.businessStatus,
            assetStatus: rec.assetStatus || match.assetStatus,
            debtStatus: rec.debtStatus || match.debtStatus,
            staffStatus: rec.staffStatus || match.staffStatus,
            otherFeedback: rec.otherFeedback || match.otherFeedback,
            coordination: rec.coordination || match.coordination,
            progress: rec.progress.length > 0 ? rec.progress : match.progress,
          }
          count++
        }
      }
      setImportedExtras(newExtras)
      localStorage.setItem(storageKey, JSON.stringify(newExtras))
      setImportCount(count)
      setTimeout(() => setImportCount(null), 3000)
    } catch (err) {
      console.error('导入失败:', err)
      alert('导入失败，请检查文件格式是否正确')
    }
    e.target.value = ''
  }

  const [companyOpen, setCompanyOpen] = useState(false)
  const [companyRecord, setCompanyRecord] = useState<LevelRecord | null>(null)

  const handleViewCompany = (record: LevelRecord) => {
    setCompanyRecord(record)
    setCompanyOpen(true)
  }

  const columns = createColumns(handleViewProgress, handleViewDetail, handleViewCompany)

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize })

  const table = useReactTable({
    data,
    columns,
    state: { pagination, globalFilter, columnFilters },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    enableSortingRemoval: false,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
  })

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: table.getPageCount(),
    paginationItemsToDisplay: 2,
  })

  return (
    <div className='w-full'>
      <div className='border-b'>
        <div className='flex min-h-17 flex-wrap items-center justify-between gap-3 px-6 py-3'>
          <span className='text-lg font-medium'>{title}</span>
          <div className='flex items-center gap-2'>
            <div className='relative'>
              <SearchIcon className='text-muted-foreground absolute left-2.5 top-2.5 size-4' />
              <Input placeholder='搜索企业...' className='pl-8 w-60' value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} />
            </div>
            <Select
              value={(columnFilters.find(f => f.id === 'industry')?.value as string) ?? 'all'}
              onValueChange={value => { setColumnFilters(prev => { const next = prev.filter(f => f.id !== 'industry'); if (value !== 'all') next.push({ id: 'industry', value }); return next }) }}
            >
              <SelectTrigger className='w-36'><SelectValue placeholder='全部行业' /></SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部行业</SelectItem>
                {industries.map(item => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={(columnFilters.find(f => f.id === 'township')?.value as string) ?? 'all'}
              onValueChange={value => { setColumnFilters(prev => { const next = prev.filter(f => f.id !== 'township'); if (value !== 'all') next.push({ id: 'township', value }); return next }) }}
            >
              <SelectTrigger className='w-40'><SelectValue placeholder='全部乡镇' /></SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部乡镇</SelectItem>
                {townships.map(item => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='text-muted-foreground size-8 rounded-full'>
                  <EllipsisVerticalIcon /><span className='sr-only'>菜单</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={() => exportLevelAll(data, title)}>导出全部</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setExportOpen(true)}>分类导出</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setQuestionnaireOpen(true)}>导出分类问卷</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant='ghost' size='icon' className='size-8' onClick={() => window.location.reload()}>
              <RefreshCwIcon className='size-4' />
              <span className='sr-only'>刷新</span>
            </Button>
            <Button variant='outline' size='sm' onClick={() => exportLevelAll(data, title)}>
              <DownloadIcon className='size-4' />
              导出
            </Button>
            <Button size='sm' onClick={() => fileInputRef.current?.click()}>
              <UploadIcon className='size-4' />
              导入
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className='h-14 border-t'>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} style={{ width: `${header.getSize()}px` }} className='text-muted-foreground first:pl-4 last:px-4'>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <div
                        className={cn(header.column.getCanSort() && 'flex h-full cursor-pointer items-center justify-between gap-2 select-none')}
                        onClick={header.column.getToggleSortingHandler()}
                        onKeyDown={e => { if (header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); header.column.getToggleSortingHandler()?.(e) } }}
                        tabIndex={header.column.getCanSort() ? 0 : undefined}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: <ChevronUpIcon className='shrink-0 opacity-60' size={16} />, desc: <ChevronDownIcon className='shrink-0 opacity-60' size={16} /> }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    ) : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className='h-17 first:pl-4 last:px-4'>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>暂无数据</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className='flex items-center justify-between gap-3 px-6 py-4 max-sm:flex-col'>
        <p className='text-muted-foreground text-sm whitespace-nowrap' aria-live='polite'>
          显示第{' '}
          <span>{table.getState().pagination.pageIndex * pageSize + 1} - {Math.min(table.getState().pagination.pageIndex * pageSize + pageSize, table.getRowCount())}</span>
          {' '}条，共 <span>{table.getRowCount()} 条</span>
        </p>
        <div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button className='disabled:pointer-events-none disabled:opacity-50' variant='ghost' onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label='上一页'>
                  <ChevronLeftIcon />上一页
                </Button>
              </PaginationItem>
              {showLeftEllipsis && <PaginationItem><PaginationEllipsis /></PaginationItem>}
              {pages.map(page => {
                const isActive = page === table.getState().pagination.pageIndex + 1
                return (
                  <PaginationItem key={page}>
                    <Button size='icon' className={`${!isActive && 'bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40'}`} onClick={() => table.setPageIndex(page - 1)} aria-current={isActive ? 'page' : undefined}>{page}</Button>
                  </PaginationItem>
                )
              })}
              {showRightEllipsis && <PaginationItem><PaginationEllipsis /></PaginationItem>}
              <PaginationItem>
                <Button className='disabled:pointer-events-none disabled:opacity-50' variant='ghost' onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label='下一页'>
                  下一页<ChevronRightIcon />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {/* 进展详情弹窗 */}
      <Dialog open={progressOpen} onOpenChange={setProgressOpen}>
        <DialogContent className='sm:max-w-2xl max-h-[80vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>企业进展详情</DialogTitle>
            <DialogDescription>{progressRecord?.companyName}</DialogDescription>
          </DialogHeader>
          {progressRecord && (
            <div className='flex flex-col gap-6 py-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <InfoField label='经营情况' value={progressRecord.businessStatus} />
                <InfoField label='资产情况' value={progressRecord.assetStatus} />
                <InfoField label='负债情况' value={progressRecord.debtStatus} />
                <InfoField label='员工情况' value={progressRecord.staffStatus} />
                <InfoField label='其他需要反馈的情况' value={progressRecord.otherFeedback} />
                <InfoField label='需要协调的事项' value={progressRecord.coordination} />
              </div>
              <Separator />
              <div>
                <h4 className='text-sm font-semibold mb-4'>进展记录</h4>
                {progressRecord.progress.length > 0 ? (
                  <div className='relative pl-6 border-l-2 border-muted flex flex-col gap-6'>
                    {progressRecord.progress.map((entry, i) => (
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
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setProgressOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情查看弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{detailLabel}</DialogTitle>
            <DialogDescription className='sr-only'>查看{detailLabel}详细内容</DialogDescription>
          </DialogHeader>
          <p className='text-sm whitespace-pre-wrap py-2'>{detailValue}</p>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDetailOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 企业详情 Dialog */}
      <Dialog open={companyOpen} onOpenChange={setCompanyOpen}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{companyRecord?.companyName}</DialogTitle>
            <DialogDescription>{companyRecord?.industry} · {companyRecord?.township}</DialogDescription>
          </DialogHeader>
          {companyRecord && (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 py-4'>
              <InfoField label='经营情况' value={companyRecord.businessStatus || '—'} />
              <InfoField label='资产情况' value={companyRecord.assetStatus || '—'} />
              <InfoField label='负债情况' value={companyRecord.debtStatus || '—'} />
              <InfoField label='员工情况' value={companyRecord.staffStatus || '—'} />
              <InfoField label='其他需要反馈的情况' value={companyRecord.otherFeedback || '—'} />
            </div>
          )}
          <DialogFooter>
            <Button variant='outline' asChild>
              <Link to={`/app/screening/${companyRecord?.id}`}>查看详情</Link>
            </Button>
            <Button variant='outline' onClick={() => setCompanyOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 分类导出 Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>分类导出</DialogTitle>
            <DialogDescription>
              按行业×乡镇组合导出，每个组合生成一个 Excel 文件，打包为 zip 下载。
            </DialogDescription>
          </DialogHeader>
          <div className='py-4 space-y-4'>
            <div>
              <Label htmlFor='level-export-date'>筛选条件（可选）</Label>
              <Input
                id='level-export-date'
                type='date'
                className='mt-2'
                value={exportDate}
                onChange={e => setExportDate(e.target.value)}
                placeholder='不选则导出全部'
              />
              <p className='text-xs text-muted-foreground mt-1'>不选日期则导出全部数据</p>
            </div>
            <p className='text-sm text-muted-foreground'>
              将导出 {industries.length} 个行业 × {townships.length} 个乡镇的组合，仅包含有数据的组合。
            </p>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setExportOpen(false)}>取消</Button>
            <Button onClick={async () => {
              // 市级/镇级表没有 reportDate 字段，直接导出全部
              await exportLevelZip(
                data,
                industries.map(i => i.name),
                townships.map(t => t.name),
                title,
              )
              setExportOpen(false)
            }}>
              <DownloadIcon className='size-4' />
              导出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导出分类问卷 Dialog */}
      <Dialog open={questionnaireOpen} onOpenChange={setQuestionnaireOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>导出分类问卷</DialogTitle>
            <DialogDescription>
              按行业×乡镇导出空白问卷，截止日期将作为进展列的时间。
            </DialogDescription>
          </DialogHeader>
          <div className='py-4 space-y-4'>
            <div>
              <Label htmlFor='q-report-date'>上报时间晚于</Label>
              <Input id='q-report-date' type='date' className='mt-2' value={qReportDate} onChange={e => setQReportDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor='q-deadline'>截止日期</Label>
              <Input id='q-deadline' type='date' className='mt-2' value={qDeadline} onChange={e => setQDeadline(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setQuestionnaireOpen(false)}>取消</Button>
            <Button disabled={!qDeadline} onClick={async () => {
              // 格式化截止日期为中文
              const d = new Date(qDeadline)
              const deadlineStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
              await exportLevelQuestionnaire(
                data,
                industries.map(i => i.name),
                townships.map(t => t.name),
                title,
                deadlineStr,
              )
              setQuestionnaireOpen(false)
            }}>
              <DownloadIcon className='size-4' />
              导出问卷
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 隐藏文件选择器 */}
      <input
        ref={fileInputRef}
        type='file'
        accept='.xlsx,.xls'
        className='hidden'
        onChange={handleImport}
      />

      {/* 导入成功提示 */}
      {importCount !== null && (
        <div className='fixed bottom-6 right-6 rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground shadow-lg'>
          成功匹配并更新 {importCount} 条记录
        </div>
      )}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex flex-col gap-1'>
      <span className='text-xs text-muted-foreground'>{label}</span>
      <span className='text-sm'>{value}</span>
    </div>
  )
}
