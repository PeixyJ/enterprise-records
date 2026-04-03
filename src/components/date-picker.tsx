'use client'

import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export function DatePicker({ value, onChange, placeholder = '选择日期' }: {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)

  const selected = value ? new Date(value + 'T00:00:00') : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant='outline' className='w-36 justify-between font-normal text-sm'>
          {selected ? selected.toLocaleDateString('zh-CN') : <span className='text-muted-foreground'>{placeholder}</span>}
          <ChevronDownIcon className='size-4 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto overflow-hidden p-0' align='start'>
        <Calendar
          mode='single'
          selected={selected}
          onSelect={date => {
            if (date) {
              const y = date.getFullYear()
              const m = String(date.getMonth() + 1).padStart(2, '0')
              const d = String(date.getDate()).padStart(2, '0')
              onChange(`${y}-${m}-${d}`)
            } else {
              onChange('')
            }
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
