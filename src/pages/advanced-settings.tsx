import { useRef, useState } from 'react'
import { AlertTriangleIcon, DownloadIcon, InfoIcon, RotateCcwIcon, ShieldAlertIcon, UploadIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { verifyLogin } from '@/lib/auth'
import { exportDatabase, importDatabase, resetScreeningData } from '@/db/database'

type PendingAction = 'reset' | 'export' | 'import' | null

export default function AdvancedSettingsPage() {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openAuth = (action: PendingAction) => {
    setPendingAction(action)
    setPassword('')
    setError('')
  }

  const handleSelectFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
      openAuth('import')
    }
    e.target.value = ''
  }

  const handleConfirm = async () => {
    if (!verifyLogin('admin', password)) {
      setError('密码错误，请重新输入')
      return
    }

    if (pendingAction === 'reset') {
      resetScreeningData()
      setSuccessMsg('初筛表数据已清除，系统已初始化')
    } else if (pendingAction === 'export') {
      const data = exportDatabase()
      const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/x-sqlite3' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `enterprise-records-backup-${new Date().toISOString().slice(0, 10)}.sqlite`
      a.click()
      URL.revokeObjectURL(url)
      setSuccessMsg('数据库备份已下载')
    } else if (pendingAction === 'import' && importFile) {
      try {
        const buf = await importFile.arrayBuffer()
        await importDatabase(new Uint8Array(buf))
        setSuccessMsg('数据库已恢复，页面即将刷新...')
        setTimeout(() => window.location.reload(), 1500)
      } catch {
        setError('导入失败，请确认文件是有效的 SQLite 数据库')
        return
      }
    }

    setPendingAction(null)
    setPassword('')
    setError('')
    setImportFile(null)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const authDescription: Record<string, string> = {
    reset: '您正在执行初始化操作，此操作不可撤销。请输入管理员密码确认身份。',
    export: '请输入管理员密码以导出数据库备份。',
    import: '导入将覆盖当前所有数据，此操作不可撤销。请输入管理员密码确认身份。',
  }

  return (
    <div className='w-full'>
      <div className='border-b'>
        <div className='flex min-h-17 items-center px-6 py-3'>
          <span className='text-lg font-medium'>高级设置</span>
        </div>
      </div>

      <div className='p-6 space-y-6 max-w-2xl'>
        {/* 导出备份 */}
        <Card>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600'>
                <DownloadIcon className='size-5' />
              </div>
              <div>
                <CardTitle>导出备份</CardTitle>
                <CardDescription>导出当前数据库的完整备份文件（.sqlite）</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground mb-4'>
              备份文件包含所有字典数据（行业、乡镇）及系统配置。建议定期备份以防数据丢失。
            </p>
            <Button onClick={() => openAuth('export')}>
              <DownloadIcon className='size-4' />
              导出备份
            </Button>
          </CardContent>
        </Card>

        {/* 导入恢复 */}
        <Card>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600'>
                <UploadIcon className='size-5' />
              </div>
              <div>
                <CardTitle>导入恢复</CardTitle>
                <CardDescription>从备份文件（.sqlite）恢复数据库</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground mb-4'>
              上传之前导出的 .sqlite 备份文件，将完全覆盖当前数据库。导入后页面会自动刷新。
            </p>
            <Button variant='outline' onClick={handleSelectFile}>
              <UploadIcon className='size-4' />
              选择备份文件
            </Button>
          </CardContent>
        </Card>

        {/* 初始化系统 */}
        <Card className='border-red-200'>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-lg bg-red-100 text-red-600'>
                <AlertTriangleIcon className='size-5' />
              </div>
              <div>
                <CardTitle className='text-red-700'>初始化系统</CardTitle>
                <CardDescription>清除初筛表所有数据，将系统恢复到初始状态</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground mb-4'>
              此操作将删除初筛表中的所有企业记录数据。字典数据（行业、乡镇）将保留。此操作不可撤销，请谨慎操作。
            </p>
            <Button variant='destructive' onClick={() => openAuth('reset')}>
              <RotateCcwIcon className='size-4' />
              初始化系统
            </Button>
          </CardContent>
        </Card>
        {/* 系统信息 */}
        <Card>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600'>
                <InfoIcon className='size-5' />
              </div>
              <div>
                <CardTitle>系统信息</CardTitle>
                <CardDescription>当前系统的版本信息</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className='text-sm text-muted-foreground space-y-1'>
              <p>构建时间：{__BUILD_TIME__}</p>
              <p>版本标识：{__GIT_HASH__}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 隐藏文件选择器 */}
      <input
        ref={fileInputRef}
        type='file'
        accept='.sqlite,.db'
        className='hidden'
        onChange={handleFileChange}
      />

      {/* 密码认证弹窗 */}
      <Dialog open={pendingAction !== null} onOpenChange={open => { if (!open) { setPendingAction(null); setImportFile(null) } }}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <ShieldAlertIcon className='size-5' />
              安全验证
            </DialogTitle>
            <DialogDescription>
              {pendingAction && authDescription[pendingAction]}
              {pendingAction === 'import' && importFile && (
                <span className='block mt-1 font-mono text-xs'>文件：{importFile.name}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Label htmlFor='auth-password'>管理员密码</Label>
            <Input
              id='auth-password'
              type='password'
              placeholder='请输入密码'
              className='mt-2'
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
              autoFocus
            />
            {error && <p className='text-sm text-red-500 mt-2'>{error}</p>}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => { setPendingAction(null); setImportFile(null) }}>取消</Button>
            {pendingAction === 'reset' ? (
              <Button variant='destructive' onClick={handleConfirm} disabled={!password}>确认初始化</Button>
            ) : pendingAction === 'import' ? (
              <Button variant='destructive' onClick={handleConfirm} disabled={!password}>确认导入覆盖</Button>
            ) : (
              <Button onClick={handleConfirm} disabled={!password}>确认导出</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 成功提示 */}
      {successMsg && (
        <div className='fixed bottom-6 right-6 rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground shadow-lg'>
          {successMsg}
        </div>
      )}
    </div>
  )
}
