import { useState } from 'react'

import { Input } from '@/components/ui/input'

export function PageJump({ pageCount, onJump }: {
  pageCount: number
  onJump: (page: number) => void
}) {
  const [value, setValue] = useState('')

  const commit = () => {
    const page = parseInt(value, 10)
    if (!Number.isNaN(page) && page >= 1 && page <= pageCount) {
      onJump(page)
    }
    setValue('')
  }

  return (
    <div className='flex items-center gap-1.5 text-muted-foreground text-sm whitespace-nowrap'>
      <span>跳至</span>
      <Input
        type='text'
        inputMode='numeric'
        value={value}
        onChange={e => setValue(e.target.value.replace(/\D/g, ''))}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
        onBlur={commit}
        className='h-9 w-14 text-center'
        aria-label='跳转到指定页码'
      />
      <span>页</span>
    </div>
  )
}
