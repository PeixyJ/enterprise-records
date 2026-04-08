const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronDB', {
  readDatabase: () => ipcRenderer.invoke('db:read'),
  writeDatabase: (data) => ipcRenderer.invoke('db:write', Buffer.from(data)),
  backupDatabase: (label) => ipcRenderer.invoke('db:backup', label),
})
