'use client'

import { useRef, useState } from 'react'
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
    header: '正常运营',
    accessorKey: 'isOperating',
    cell: ({ row }) => {
      const val = row.getValue('isOperating') as boolean
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
  { id: '1', creditCode: '91110105MA01XXXX1A', companyName: '华兴科技有限公司', industry: '信息技术', township: '中关村街道', isAboveScale: true, isOperating: true, inTownLevel: true, inCityLevel: true, reportDate: '2026-03-15', reportCount: 3 },
  { id: '2', creditCode: '91110102MA02XXXX2B', companyName: '鑫达贸易有限公司', industry: '批发零售', township: '望京街道', isAboveScale: false, isOperating: true, inTownLevel: true, inCityLevel: false, reportDate: '2026-03-18', reportCount: 1 },
  { id: '3', creditCode: '91110108MA03XXXX3C', companyName: '博远建筑工程公司', industry: '建筑业', township: '亦庄镇', isAboveScale: true, isOperating: true, inTownLevel: true, inCityLevel: true, reportDate: '2026-03-20', reportCount: 5 },
  { id: '4', creditCode: '91110114MA04XXXX4D', companyName: '绿源环保科技公司', industry: '环保', township: '回龙观镇', isAboveScale: false, isOperating: false, inTownLevel: false, inCityLevel: false, reportDate: '2026-03-22', reportCount: 2 },
  { id: '5', creditCode: '91110106MA05XXXX5E', companyName: '天宇物流有限公司', industry: '物流运输', township: '马驹桥镇', isAboveScale: true, isOperating: true, inTownLevel: true, inCityLevel: false, reportDate: '2026-03-25', reportCount: 4 },
  { id: '6', creditCode: '91110112MA06XXXX6F', companyName: '嘉和食品有限公司', industry: '食品加工', township: '西红门镇', isAboveScale: false, isOperating: true, inTownLevel: false, inCityLevel: false, reportDate: '2026-03-26', reportCount: 1 },
  { id: '7', creditCode: '91110115MA07XXXX7G', companyName: '明辉电子科技公司', industry: '电子制造', township: '上地街道', isAboveScale: true, isOperating: true, inTownLevel: true, inCityLevel: true, reportDate: '2026-03-27', reportCount: 6 },
  { id: '8', creditCode: '91110113MA08XXXX8H', companyName: '瑞丰农业发展公司', industry: '农业', township: '长阳镇', isAboveScale: false, isOperating: false, inTownLevel: true, inCityLevel: false, reportDate: '2026-03-28', reportCount: 2 },
  { id: '9', creditCode: '91110114MA09XXXX9J', companyName: '恒达机械制造公司', industry: '机械制造', township: '城关镇', isAboveScale: true, isOperating: true, inTownLevel: true, inCityLevel: true, reportDate: '2026-03-29', reportCount: 3 },
  { id: '10', creditCode: '91110107MA10XXXXAK', companyName: '新世纪教育培训公司', industry: '教育', township: '天通苑街道', isAboveScale: false, isOperating: true, inTownLevel: false, inCityLevel: false, reportDate: '2026-03-30', reportCount: 1 },
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
  const industries = getIndustries()
  const townships = getTownships()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importCount, setImportCount] = useState<number | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackRecord, setFeedbackRecord] = useState<ScreeningRecord | null>(null)
  const [fbIsOperating, setFbIsOperating] = useState(false)
  const [fbInTownLevel, setFbInTownLevel] = useState(false)
  const [fbInCityLevel, setFbInCityLevel] = useState(false)

  const handleOpenFeedback = (record: ScreeningRecord) => {
    setFeedbackRecord(record)
    setFbIsOperating(record.isOperating)
    setFbInTownLevel(record.inTownLevel)
    setFbInCityLevel(record.inCityLevel)
    setFeedbackOpen(true)
  }

  const handleSaveFeedback = () => {
    // TODO: 保存反馈数据
    console.log('保存反馈:', {
      id: feedbackRecord?.id,
      isOperating: fbIsOperating,
      inTownLevel: fbInTownLevel,
      inCityLevel: fbInCityLevel,
    })
    setFeedbackOpen(false)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await importScreeningExcel(file)
      // 加载已有的详细数据
      const existingDetail: Record<string, unknown> = (() => {
        const s = localStorage.getItem(SCREENING_DETAIL_KEY)
        if (s) try { return JSON.parse(s) } catch { /* */ }
        return {}
      })()
      const newRecords: ScreeningRecord[] = imported.map((r, i) => {
        const id = `imp-${Date.now()}-${i}`
        // 保存详细数据（税务、人社等）到 detail store
        existingDetail[id] = {
          tax: r.tax,
          social: r.social,
          power: r.power,
          water: r.water,
          loan: r.loan,
          reportSource: r.reportSource,
        }
        return {
          id,
          creditCode: r.creditCode,
          companyName: r.companyName,
          industry: r.industry,
          township: r.township,
          isAboveScale: r.isAboveScale,
          isOperating: r.feedback.isOperating,
          inTownLevel: r.feedback.inTownLevel,
          inCityLevel: r.feedback.inCityLevel,
          reportDate: r.reportDate,
          reportCount: r.reportCount,
        }
      })
      localStorage.setItem(SCREENING_DETAIL_KEY, JSON.stringify(existingDetail))
      setData(prev => recalcReportCounts([...newRecords, ...prev]))
      setImportCount(newRecords.length)
      setTimeout(() => setImportCount(null), 3000)
    } catch (err) {
      console.error('导入失败:', err)
      alert('导入失败，请检查文件格式是否正确')
    }
    // 清空 input 以便再次选择同一文件
    e.target.value = ''
  }

  const [exportOpen, setExportOpen] = useState(false)
  const [exportDate, setExportDate] = useState('')
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

  const table = useReactTable({
    data,
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
        <div className='flex min-h-17 flex-wrap items-center justify-between gap-3 px-6 py-3'>
          <span className='text-lg font-medium'>初筛表</span>
          <div className='flex items-center gap-2'>
            <div className='relative'>
              <SearchIcon className='text-muted-foreground absolute left-2.5 top-2.5 size-4' />
              <Input
                placeholder='搜索企业...'
                className='pl-8 w-60'
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
              <SelectTrigger className='w-36'>
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
              <SelectTrigger className='w-40'>
                <SelectValue placeholder='全部乡镇' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部乡镇</SelectItem>
                {townships.map(item => (
                  <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='text-muted-foreground size-8 rounded-full'>
                  <EllipsisVerticalIcon />
                  <span className='sr-only'>菜单</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={() => exportScreeningAll(data)}>导出全部</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setExportOpen(true)}>分类导出</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant='ghost' size='icon' className='size-8' onClick={() => window.location.reload()}>
              <RefreshCwIcon className='size-4' />
              <span className='sr-only'>刷新</span>
            </Button>
            <Button variant='outline' size='sm' onClick={() => exportScreeningAll(data)}>
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
              <Label htmlFor='fb-town'>列入镇级</Label>
              <Switch id='fb-town' checked={fbInTownLevel} onCheckedChange={setFbInTownLevel} />
            </div>
            <div className='flex items-center justify-between'>
              <Label htmlFor='fb-city'>列入市级</Label>
              <Switch id='fb-city' checked={fbInCityLevel} onCheckedChange={setFbInCityLevel} />
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
