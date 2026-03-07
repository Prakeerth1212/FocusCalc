const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

let mainWindow
let backendProcess

function getBackendPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend', 'focuscalc-backend.exe')
  }
  return path.join(__dirname, '..', 'BACKEND', 'dist', 'focuscalc-backend.exe')
}

function startBackend() {
  const backendPath = getBackendPath()
  console.log('Starting backend from:', backendPath)
  
  if (!fs.existsSync(backendPath)) {
    console.error('Backend not found at:', backendPath)
    return
  }

  backendProcess = spawn(backendPath, [], {
    detached: false,
    stdio: 'ignore'
  })

  backendProcess.on('error', (err) => {
    console.error('Backend error:', err)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'FocusCalc'
  })

  // wait for backend to start
  setTimeout(() => {
    mainWindow.loadFile(path.join(__dirname, 'SRC', 'index.html'))
  }, 2000)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  startBackend()
  createWindow()
})

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})