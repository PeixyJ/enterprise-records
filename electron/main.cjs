const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const DB_PATH = path.join(app.getPath('userData'), 'enterprise-records.sqlite')

// ---- IPC: database file operations ----

ipcMain.handle('db:read', async () => {
  if (fs.existsSync(DB_PATH)) {
    return fs.readFileSync(DB_PATH)
  }
  return null
})

ipcMain.handle('db:write', async (_event, data) => {
  fs.writeFileSync(DB_PATH, Buffer.from(data))
})

ipcMain.handle('db:backup', async (_event, versionLabel) => {
  if (fs.existsSync(DB_PATH)) {
    const safeName = versionLabel.replace(/[^a-zA-Z0-9._-]/g, '_')
    const backupPath = path.join(app.getPath('userData'), `enterprise-records-backup-${safeName}.sqlite`)
    fs.copyFileSync(DB_PATH, backupPath)
  }
})

// ---- Window ----

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: '企业档案系统',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  } else {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    mainWindow.loadURL(devUrl).catch(() => {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    })
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
