'use client'

import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  EllipsisVerticalIcon,
  UploadIcon,
  DownloadIcon,
  RefreshCwIcon,
  SearchIcon,
  Building2Icon,
  MonitorIcon,
  ShoppingCartIcon,
  HardHatIcon,
  LeafIcon,
  TruckIcon,
  UtensilsIcon,
  CpuIcon,
  SproutIcon,
  CogIcon,
  GraduationCapIcon,
  CheckIcon,
  XIcon,
  type LucideIcon,
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
import { DatePicker } from '@/components/date-picker'
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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { usePagination } from '@/hooks/use-pagination'
import { getIndustries, getTownships } from '@/db/dict'
import { SCREENING_STORAGE_KEY, SCREENING_DETAIL_KEY } from '@/db/database'
import { importScreeningExcel, exportScreeningAll, exportScreeningZip } from '@/lib/excel'

const industryIconMap: Record<string, LucideIcon> = {
  '信息技术': MonitorIcon,
  '批发零售': ShoppingCartIcon,
  '建筑业': HardHatIcon,
  '环保': LeafIcon,
  '物流运输': TruckIcon,
  '食品加工': UtensilsIcon,
  '电子制造': CpuIcon,
  '农业': SproutIcon,
  '机械制造': CogIcon,
  '教育': GraduationCapIcon,
}

export function getIndustryIcon(industry: string): LucideIcon {
  return industryIconMap[industry] ?? Building2Icon
}

export type ScreeningRecord = {
  id: string
  creditCode: string
  companyName: string
  industry: string
  township: string
  isAboveScale: boolean
  isOperating: boolean
  inTownLevel: boolean
  inCityLevel: boolean
  inOther: boolean
  reportDate: string
  reportCount: number
}

function createColumns(onFeedback: (record: ScreeningRecord) => void, onDelete: (record: ScreeningRecord) => void): ColumnDef<ScreeningRecord>[] {
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
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label='选择行'
      />
    ),
    size: 50,
  },
  {
    header: '社会信用代码',
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
      return (
        <Link to={`/app/screening/${row.original.id}`} className='flex items-center gap-2 hover:underline'>
          <Avatar className='size-8'>
            <AvatarFallback className='bg-primary/10 text-primary'>
              <Icon className='size-4' />
            </AvatarFallback>
          </Avatar>
          <div className='flex flex-col'>
            <span className='font-medium'>{row.getValue('companyName')}</span>
            <span className='text-xs text-muted-foreground'>{row.original.industry}</span>
          </div>
        </Link>
      )
    },
  },
  {
    header: '街道乡镇',
    accessorKey: 'township',
    cell: ({ row }) => <span className='text-muted-foreground'>{row.getValue('township')}</span>,
  },
  {
    header: '规上企业',
    accessorKey: 'isAboveScale',
    cell: ({ row }) => {
      const val = row.getValue('isAboveScale') as boolean
      return <Badge className={cn('rounded-sm px-1.5', val
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-muted text-muted-foreground'
      )}>{val ? '是' : '否'}</Badge>
    },
  },
  {
    header: '运营',
    accessorKey: 'isOperating',
    cell: ({ row }) => {
      const val = row.getValue('isOperating') as boolean
      return val
        ? <CheckIcon className='size-4 text-green-600' />
        : <XIcon className='size-4 text-red-500' />
    },
  },
  {
    header: '市级',
    accessorKey: 'inCityLevel',
    cell: ({ row }) => {
      const val = row.getValue('inCityLevel') as boolean
      return val
        ? <CheckIcon className='size-4 text-green-600' />
        : <XIcon className='size-4 text-red-500' />
    },
  },
  {
    header: '镇级',
    accessorKey: 'inTownLevel',
    cell: ({ row }) => {
      const val = row.getValue('inTownLevel') as boolean
      return val
        ? <CheckIcon className='size-4 text-green-600' />
        : <XIcon className='size-4 text-red-500' />
    },
  },
  {
    header: '其他',
    accessorKey: 'inOther',
    cell: ({ row }) => {
      const val = row.getValue('inOther') as boolean
      return val
        ? <CheckIcon className='size-4 text-green-600' />
        : <XIcon className='size-4 text-red-500' />
    },
  },
  {
    header: '上报时间',
    accessorKey: 'reportDate',
    cell: ({ row }) => <span className='text-muted-foreground'>{row.getValue('reportDate')}</span>,
  },
  {
    header: '上报次数',
    accessorKey: 'reportCount',
    cell: ({ row }) => <span className='text-muted-foreground'>{row.getValue('reportCount')}</span>,
  },
  {
    id: 'actions',
    header: '操作',
    enableSorting: false,
    cell: ({ row }) => (
      <div className='flex items-center gap-1'>
        <Button variant='outline' size='sm' onClick={() => onFeedback(row.original)}>
          乡镇反馈
        </Button>
        <Button variant='ghost' size='sm' className='text-red-500 hover:text-red-700 hover:bg-red-50' onClick={() => onDelete(row.original)}>
          删除
        </Button>
      </div>
    ),
  },
]
}

export const demoData: ScreeningRecord[] = [
  { id: '1', creditCode: '91110105MA01XXXX1A', companyName: '华兴科技有限公司', industry: '信息技术', township: '中关村街道', isAboveScale: true, isOperating: true, inTownLevel: true, inCityLevel: true, inOther: false, reportDate: '2026-03-15', reportCount: 3 },
  { id: '2', creditCode: '91110102MA02XXXX2B', companyName: '鑫达贸易有限公司', industry: '批发零售', township: '望京街道', isAboveScale: false, isOperating: true, inTownLevel: true, inCityLevel: false, inOther: false, reportDate: '2026-03-18', reportCount: 1 },
  { id: '3', creditCode: '91110108MA03XXXX3C', companyName: '博远建筑工程公司', industry: '建筑业', township: '亦庄镇', isAboveScale: true, isOperating: true, inTownLevel: true, inCityLevel: true, inOther: false, reportDate: '2026-03-20', reportCount: 5 },
  { id: '4', creditCode: '91110114MA04XXXX4D', companyName: '绿源环保科技公司', industry: '环保', township: '回龙观镇', isAboveScale: false, isOperating: false, inTownLevel: false, inCityLevel: false, inOther: false, reportDate: '2026-03-22', reportCount: 2 },
  { id: '5', creditCode: '91110106MA05XXXX5E', companyName: '天宇物流有限公司', industry: '物流运输', township: '马驹桥镇', isAboveScale: true, isOperating: true, inTownLevel: true, inCityLevel: false, inOther: false, reportDate: '2026-03-25', reportCount: 4 },
  { id: '6', creditCode: '91110112MA06XXXX6F', companyName: '嘉和食品有限公司', industry: '食品加工', township: '西红门镇', isAboveScale: false, isOperating: true, inTownLevel: false, inCityLevel: false, inOther: false, reportDate: '2026-03-26', reportCount: 1 },
  { id: '7', creditCode: '91110115MA07XXXX7G', companyName: '明辉电子科技公司', industry: '电子制造', township: '上地街道', isAboveScale: true, isOperating: true, inTownLevel: true, inCityLevel: true, inOther: false, reportDate: '2026-03-27', reportCount: 6 },
  { id: '8', creditCode: '91110113MA08XXXX8H', companyName: '瑞丰农业发展公司', industry: '农业', township: '长阳镇', isAboveScale: false, isOperating: false, inTownLevel: true, inCityLevel: false, inOther: false, reportDate: '2026-03-28', reportCount: 2 },
  { id: '9', creditCode: '91110114MA09XXXX9J', companyName: '恒达机械制造公司', industry: '机械制造', township: '城关镇', isAboveScale: true, isOperating: true, inTownLevel: true, inCityLevel: true, inOther: false, reportDate: '2026-03-29', reportCount: 3 },
  { id: '10', creditCode: '91110107MA10XXXXAK', companyName: '新世纪教育培训公司', industry: '教育', township: '天通苑街道', isAboveScale: false, isOperating: true, inTownLevel: false, inCityLevel: false, inOther: false, reportDate: '2026-03-30', reportCount: 1 },
]

function recalcReportCounts(records: ScreeningRecord[]): ScreeningRecord[] {
  const countMap = new Map<string, number>()
  for (const r of records) {
    if (r.creditCode) countMap.set(r.creditCode, (countMap.get(r.creditCode) ?? 0) + 1)
  }
  return records.map(r => ({ ...r, reportCount: r.creditCode ? (countMap.get(r.creditCode) ?? 1) : r.reportCount }))
}

function loadScreeningData(): ScreeningRecord[] {
  const saved = localStorage.getItem(SCREENING_STORAGE_KEY)
  if (saved) {
    try { return recalcReportCounts(JSON.parse(saved)) } catch { /* fall through */ }
  }
  return recalcReportCounts(demoData)
}

function saveScreeningData(records: ScreeningRecord[]) {
  localStorage.setItem(SCREENING_STORAGE_KEY, JSON.stringify(records))
}

export default function ScreeningPage() {
  const pageSize = 8
  const [data, setDataRaw] = useState<ScreeningRecord[]>(loadScreeningData)

  const setData = (updater: ScreeningRecord[] | ((prev: ScreeningRecord[]) => ScreeningRecord[])) => {
    setDataRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveScreeningData(next)
      return next
    })
  }
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [levelFilter, setLevelFilter] = useState<'all' | 'town' | 'city' | 'other'>('all')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const industries = getIndustries()
  const townships = getTownships()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importCount, setImportCount] = useState<number | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackRecord, setFeedbackRecord] = useState<ScreeningRecord | null>(null)
  const [fbIsOperating, setFbIsOperating] = useState(false)
  const [fbInTownLevel, setFbInTownLevel] = useState(false)
  const [fbInCityLevel, setFbInCityLevel] = useState(false)
  const [fbInOther, setFbInOther] = useState(false)

  const handleOpenFeedback = (record: ScreeningRecord) => {
    setFeedbackRecord(record)
    setFbIsOperating(record.isOperating)
    setFbInTownLevel(record.inTownLevel)
    setFbInCityLevel(record.inCityLevel)
    setFbInOther(record.inOther)
    setFeedbackOpen(true)
  }

  const handleSaveFeedback = () => {
    if (feedbackRecord) {
      setData(prev => prev.map(r => r.id === feedbackRecord.id ? {
        ...r,
        isOperating: fbIsOperating,
        inTownLevel: fbInTownLevel,
        inCityLevel: fbInCityLevel,
        inOther: fbInOther,
      } : r))
    }
    setFeedbackOpen(false)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    try {
      const existingDetail: Record<string, unknown> = (() => {
        const s = localStorage.getItem(SCREENING_DETAIL_KEY)
        if (s) try { return JSON.parse(s) } catch { /* */ }
        return {}
      })()
      const allNewRecords: ScreeningRecord[] = []
      for (let f = 0; f < files.length; f++) {
        const imported = await importScreeningExcel(files[f])
        for (let i = 0; i < imported.length; i++) {
          const r = imported[i]
          const id = `imp-${Date.now()}-${f}-${i}`
          existingDetail[id] = {
            tax: r.tax,
            social: r.social,
            power: r.power,
            water: r.water,
            loan: r.loan,
            reportSource: r.reportSource,
          }
          allNewRecords.push({
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
            reportCount: r.reportCount,
          })
        }
      }
      localStorage.setItem(SCREENING_DETAIL_KEY, JSON.stringify(existingDetail))
      setData(prev => recalcReportCounts([...allNewRecords, ...prev]))
      setImportCount(allNewRecords.length)
      setTimeout(() => setImportCount(null), 3000)
    } catch (err) {
      console.error('导入失败:', err)
      alert('导入失败，请检查文件格式是否正确')
    }
    e.target.value = ''
  }

  const [exportOpen, setExportOpen] = useState(false)
  const [exportDate, setExportDate] = useState('')
  const [exportAllOpen, setExportAllOpen] = useState(false)
  const [exportAllStartDate, setExportAllStartDate] = useState('')
  const [exportAllEndDate, setExportAllEndDate] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteRecord, setDeleteRecord] = useState<ScreeningRecord | null>(null)

  const handleDelete = (record: ScreeningRecord) => {
    setDeleteRecord(record)
    setDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (deleteRecord) {
      setData(prev => prev.filter(r => r.id !== deleteRecord.id))
    }
    setDeleteOpen(false)
    setDeleteRecord(null)
  }

  const columns = createColumns(handleOpenFeedback, handleDelete)

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  const filteredData = useMemo(() => {
    let result = data
    if (levelFilter === 'town') result = result.filter(r => r.inTownLevel)
    else if (levelFilter === 'city') result = result.filter(r => r.inCityLevel)
    else if (levelFilter === 'other') result = result.filter(r => r.inOther)
    if (dateStart) result = result.filter(r => r.reportDate >= dateStart)
    if (dateEnd) result = result.filter(r => r.reportDate <= dateEnd)
    return result
  }, [data, levelFilter, dateStart, dateEnd])

  const table = useReactTable({
    data: filteredData,
    columns,
    initialState: {
      sorting: [{ id: 'reportDate', desc: true }],
    },
    state: {
      pagination,
      globalFilter,
      columnFilters,
    },
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
        {/* 第一行：筛选条件 */}
        <div className='flex flex-wrap items-center gap-2 px-6 py-3'>
          <div className='relative'>
            <SearchIcon className='text-muted-foreground absolute left-2.5 top-2.5 size-4' />
            <Input
              placeholder='搜索企业...'
              className='pl-8 w-52'
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
            />
          </div>
          <Select
            value={(columnFilters.find(f => f.id === 'industry')?.value as string) ?? 'all'}
            onValueChange={value => {
              setColumnFilters(prev => {
                const next = prev.filter(f => f.id !== 'industry')
                if (value !== 'all') next.push({ id: 'industry', value })
                return next
              })
            }}
          >
            <SelectTrigger className='w-32'>
              <SelectValue placeholder='全部行业' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部行业</SelectItem>
              {industries.map(item => (
                <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={(columnFilters.find(f => f.id === 'township')?.value as string) ?? 'all'}
            onValueChange={value => {
              setColumnFilters(prev => {
                const next = prev.filter(f => f.id !== 'township')
                if (value !== 'all') next.push({ id: 'township', value })
                return next
              })
            }}
          >
            <SelectTrigger className='w-36'>
              <SelectValue placeholder='全部乡镇' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部乡镇</SelectItem>
              {townships.map(item => (
                <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={v => setLevelFilter(v as 'all' | 'town' | 'city' | 'other')}>
            <SelectTrigger className='w-24'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部</SelectItem>
              <SelectItem value='town'>镇级</SelectItem>
              <SelectItem value='city'>市级</SelectItem>
              <SelectItem value='other'>其他</SelectItem>
            </SelectContent>
          </Select>
          <DatePicker value={dateStart} onChange={setDateStart} placeholder='开始日期' />
          <span className='text-muted-foreground text-sm'>至</span>
          <DatePicker value={dateEnd} onChange={setDateEnd} placeholder='截止日期' />
          {(dateStart || dateEnd) && (
            <Button variant='ghost' size='sm' className='text-muted-foreground' onClick={() => { setDateStart(''); setDateEnd('') }}>
              清除
            </Button>
          )}
        </div>
        {/* 第二行：操作按钮靠右 */}
        <div className='flex items-center justify-end gap-2 px-6 pb-3'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='text-muted-foreground size-8 rounded-full'>
                <EllipsisVerticalIcon />
                <span className='sr-only'>菜单</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => setExportAllOpen(true)}>导出全部</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setExportOpen(true)}>分类导出</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant='ghost' size='icon' className='size-8' onClick={() => window.location.reload()}>
            <RefreshCwIcon className='size-4' />
            <span className='sr-only'>刷新</span>
          </Button>
          <Button variant='outline' size='sm' onClick={() => setExportAllOpen(true)}>
            <DownloadIcon className='size-4' />
            导出
          </Button>
          <Button size='sm' onClick={() => fileInputRef.current?.click()}>
            <UploadIcon className='size-4' />
            导入
          </Button>
        </div>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className='h-14 border-t'>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    style={{ width: `${header.getSize()}px` }}
                    className='text-muted-foreground first:pl-4 last:px-4'
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <div
                        className={cn(
                          header.column.getCanSort() &&
                            'flex h-full cursor-pointer items-center justify-between gap-2 select-none'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                        onKeyDown={e => {
                          if (header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault()
                            header.column.getToggleSortingHandler()?.(e)
                          }
                        }}
                        tabIndex={header.column.getCanSort() ? 0 : undefined}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ChevronUpIcon className='shrink-0 opacity-60' size={16} aria-hidden='true' />,
                          desc: <ChevronDownIcon className='shrink-0 opacity-60' size={16} aria-hidden='true' />,
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
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
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className='flex items-center justify-between gap-3 px-6 py-4 max-sm:flex-col'>
        <p className='text-muted-foreground text-sm whitespace-nowrap' aria-live='polite'>
          显示第{' '}
          <span>
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} -{' '}
            {Math.min(
              table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
                table.getState().pagination.pageSize,
              table.getRowCount()
            )}
          </span>{' '}
          条，共 <span>{table.getRowCount()} 条</span>
        </p>

        <div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  className='disabled:pointer-events-none disabled:opacity-50'
                  variant='ghost'
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label='上一页'
                >
                  <ChevronLeftIcon aria-hidden='true' />
                  上一页
                </Button>
              </PaginationItem>

              {showLeftEllipsis && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {pages.map(page => {
                const isActive = page === table.getState().pagination.pageIndex + 1
                return (
                  <PaginationItem key={page}>
                    <Button
                      size='icon'
                      className={`${!isActive && 'bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40'}`}
                      onClick={() => table.setPageIndex(page - 1)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {page}
                    </Button>
                  </PaginationItem>
                )
              })}

              {showRightEllipsis && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              <PaginationItem>
                <Button
                  className='disabled:pointer-events-none disabled:opacity-50'
                  variant='ghost'
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label='下一页'
                >
                  下一页
                  <ChevronRightIcon aria-hidden='true' />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>乡镇反馈</DialogTitle>
            <DialogDescription>{feedbackRecord?.companyName}</DialogDescription>
          </DialogHeader>
          <div className='flex flex-col gap-4 py-4'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='fb-operating'>是否正常运营</Label>
              <Switch id='fb-operating' checked={fbIsOperating} onCheckedChange={setFbIsOperating} />
            </div>
            <div className='flex items-center justify-between'>
              <Label htmlFor='fb-city'>列入市级</Label>
              <Switch id='fb-city' checked={fbInCityLevel} onCheckedChange={setFbInCityLevel} />
            </div>
            <div className='flex items-center justify-between'>
              <Label htmlFor='fb-town'>列入镇级</Label>
              <Switch id='fb-town' checked={fbInTownLevel} onCheckedChange={setFbInTownLevel} />
            </div>
            <div className='flex items-center justify-between'>
              <Label htmlFor='fb-other'>列入其他</Label>
              <Switch id='fb-other' checked={fbInOther} onCheckedChange={setFbInOther} />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setFeedbackOpen(false)}>取消</Button>
            <Button onClick={handleSaveFeedback}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除企业「{deleteRecord?.companyName}」的记录吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteOpen(false)}>取消</Button>
            <Button variant='destructive' onClick={confirmDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导出全部 Dialog */}
      <Dialog open={exportAllOpen} onOpenChange={setExportAllOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>导出表格</DialogTitle>
            <DialogDescription>筛选上报时间范围后导出为 Excel 文件。不选则导出全部数据。</DialogDescription>
          </DialogHeader>
          <div className='py-4 space-y-4'>
            <div>
              <Label htmlFor='export-all-start'>开始日期</Label>
              <Input id='export-all-start' type='date' className='mt-2' value={exportAllStartDate} onChange={e => setExportAllStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor='export-all-end'>截止日期</Label>
              <Input id='export-all-end' type='date' className='mt-2' value={exportAllEndDate} onChange={e => setExportAllEndDate(e.target.value)} />
            </div>
            <p className='text-sm text-muted-foreground'>
              {(() => {
                const filtered = data.filter(r =>
                  (!exportAllStartDate || r.reportDate >= exportAllStartDate) &&
                  (!exportAllEndDate || r.reportDate <= exportAllEndDate)
                )
                return `符合条件的记录：${filtered.length} 条`
              })()}
            </p>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setExportAllOpen(false)}>取消</Button>
            <Button onClick={() => {
              const filtered = data.filter(r =>
                (!exportAllStartDate || r.reportDate >= exportAllStartDate) &&
                (!exportAllEndDate || r.reportDate <= exportAllEndDate)
              )
              exportScreeningAll(filtered)
              setExportAllOpen(false)
            }}>
              <DownloadIcon className='size-4' />
              导出
            </Button>
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
              <Label htmlFor='export-date'>上报时间晚于</Label>
              <Input
                id='export-date'
                type='date'
                className='mt-2'
                value={exportDate}
                onChange={e => setExportDate(e.target.value)}
              />
            </div>
            <p className='text-sm text-muted-foreground'>
              将导出 {industries.length} 个行业 × {townships.length} 个乡镇的组合，
              仅包含有数据的组合。
            </p>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setExportOpen(false)}>取消</Button>
            <Button onClick={async () => {
              const filtered = exportDate
                ? data.filter(r => r.reportDate >= exportDate)
                : data
              await exportScreeningZip(
                filtered,
                industries.map(i => i.name),
                townships.map(t => t.name),
              )
              setExportOpen(false)
            }}>
              <DownloadIcon className='size-4' />
              导出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 隐藏的文件选择器 */}
      <input
        ref={fileInputRef}
        type='file'
        accept='.xlsx,.xls'
        multiple
        className='hidden'
        onChange={handleImport}
      />

      {/* 导入成功提示 */}
      {importCount !== null && (
        <div className='fixed bottom-6 right-6 rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground shadow-lg'>
          成功导入 {importCount} 条记录
        </div>
      )}
    </div>
  )
}
