'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, Trash2Icon, PencilIcon, CheckIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import {
  type DictItem,
  getTownships,
  getIndustries,
  addTownship,
  addIndustry,
  deleteTownship,
  deleteIndustry,
  updateTownship,
  updateIndustry,
} from '@/db/dict'

function DictTable({
  title,
  description,
  items,
  onAdd,
  onDelete,
  onUpdate,
}: {
  title: string
  description: string
  items: DictItem[]
  onAdd: (name: string) => void
  onDelete: (id: number) => void
  onUpdate: (id: number, name: string) => void
}) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    if (items.some((i) => i.name === trimmed)) return
    onAdd(trimmed)
    setNewName('')
  }

  const handleStartEdit = (item: DictItem) => {
    setEditingId(item.id)
    setEditingName(item.name)
  }

  const handleSaveEdit = () => {
    const trimmed = editingName.trim()
    if (!trimmed || editingId === null) return
    onUpdate(editingId, trimmed)
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='flex gap-2 mb-4'>
          <Input
            placeholder='输入名称...'
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button size='sm' onClick={handleAdd}>
            <PlusIcon className='size-4' />
            添加
          </Button>
        </div>
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-16'>序号</TableHead>
                <TableHead>名称</TableHead>
                <TableHead className='w-24 text-right'>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className='h-16 text-center text-muted-foreground'>
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className='text-muted-foreground'>{index + 1}</TableCell>
                    <TableCell>
                      {editingId === item.id ? (
                        <Input
                          className='h-8'
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit()
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                          autoFocus
                        />
                      ) : (
                        item.name
                      )}
                    </TableCell>
                    <TableCell className='text-right'>
                      {editingId === item.id ? (
                        <div className='flex justify-end gap-1'>
                          <Button variant='ghost' size='icon-xs' onClick={handleSaveEdit}>
                            <CheckIcon className='size-3.5 text-green-600' />
                          </Button>
                          <Button variant='ghost' size='icon-xs' onClick={handleCancelEdit}>
                            <XIcon className='size-3.5 text-red-500' />
                          </Button>
                        </div>
                      ) : (
                        <div className='flex justify-end gap-1'>
                          <Button variant='ghost' size='icon-xs' onClick={() => handleStartEdit(item)}>
                            <PencilIcon className='size-3.5' />
                          </Button>
                          <Button variant='ghost' size='icon-xs' onClick={() => onDelete(item.id)}>
                            <Trash2Icon className='size-3.5 text-red-500' />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const [townships, setTownships] = useState<DictItem[]>([])
  const [industries, setIndustries] = useState<DictItem[]>([])

  const reload = () => {
    setTownships(getTownships())
    setIndustries(getIndustries())
  }

  useEffect(() => {
    reload()
  }, [])

  return (
    <div className='mx-auto w-full max-w-5xl grid grid-cols-2 gap-6'>
      <DictTable
        title='街道乡镇'
        description='配置可选的街道乡镇列表'
        items={townships}
        onAdd={(name) => { addTownship(name); reload() }}
        onDelete={(id) => { deleteTownship(id); reload() }}
        onUpdate={(id, name) => { updateTownship(id, name); reload() }}
      />
      <DictTable
        title='行业'
        description='配置可选的行业列表'
        items={industries}
        onAdd={(name) => { addIndustry(name); reload() }}
        onDelete={(id) => { deleteIndustry(id); reload() }}
        onUpdate={(id, name) => { updateIndustry(id, name); reload() }}
      />
    </div>
  )
}
