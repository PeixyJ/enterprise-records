'use client'

import { useState } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export function DatePicker({ value, onChange, placeholder = '选择日期', className }: {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  const selected = value ? new Date(value + 'T00:00:00') : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          data-empty={!selected}
          className={cn('w-36 justify-start text-left font-normal data-[empty=true]:text-muted-foreground', className)}
        >
          <CalendarIcon className='size-4' />
          {selected ? selected.toLocaleDateString('zh-CN') : <span>{placeholder}</span>}
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
