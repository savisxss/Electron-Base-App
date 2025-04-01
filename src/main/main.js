const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Import node-threading components
// These will be pulled from the GitHub repository
let MainApplication, MemoryMonitor, Logger;
try {
  MainApplication = require('./node-threading/index.js');
  MemoryMonitor = require('./node-threading/MemoryMonitor');
  Logger = require('./node-threading/Logger');
  console.log('Successfully loaded node-threading modules');
} catch (error) {
  console.error('Error loading node-threading modules:', error.message);
  console.error('Please make sure you have cloned the node-threading repository into the src/main directory');
}

// Keep a global reference of the window object and threading system
let mainWindow;
let threadingSystem;

// Development mode flag
const isDev = process.argv.includes('--dev');

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../../assets/icon.ico')
  });

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open the DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Initialize threading system if available
  if (MainApplication) {
    threadingSystem = new MainApplication();
    console.log('Threading system initialized');
    
    // Set up periodic updates of memory stats
    setInterval(async () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          const stats = getMemoryStats();
          mainWindow.webContents.send('memory-stats-update', stats);
        } catch (error) {
          console.error('Error sending memory stats:', error);
        }
      }
    }, 2000);
  }

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    // Dereference the window object
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window when the dock icon is clicked
    // and there are no other windows open
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', async () => {
  // Shutdown threading system if it was initialized
  if (threadingSystem && typeof threadingSystem.shutdown === 'function') {
    try {
      await threadingSystem.shutdown();
      console.log('Threading system shutdown successfully');
    } catch (error) {
      console.error('Error shutting down threading system:', error);
    }
  }

  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers

// Get memory stats from the threading system
function getMemoryStats() {
  if (!MemoryMonitor) {
    return { error: 'Memory monitor not available' };
  }
  
  try {
    const stats = [];
    for (let i = 1; i <= 8; i++) {
      const report = MemoryMonitor.generateReport(i);
      if (report) {
        stats.push(report);
      }
    }
    return { success: true, stats };
  } catch (error) {
    console.error('Error generating memory stats:', error);
    return { error: error.message };
  }
}

// Process data using the threading system
async function processDataWithThreads(data) {
  if (!threadingSystem) {
    throw new Error('Threading system not initialized');
  }

  // Here we simulate distributing work to the worker threads
  // In a real implementation, you would modify NodeFragment.js to handle your specific processing needs
  return await threadingSystem.sayHello();
}

// Example: Open file dialog
ipcMain.handle('open-file-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

// Example: Read file
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return data;
  } catch (error) {
    console.error('Error reading file:', error);
    throw new Error(`Error reading file: ${error.message}`);
  }
});

// Example: Write file
ipcMain.handle('write-file', async (event, { filePath, content }) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error writing file:', error);
    throw new Error(`Error writing file: ${error.message}`);
  }
});

// Threading specific handlers
ipcMain.handle('get-memory-stats', async () => {
  return getMemoryStats();
});

ipcMain.handle('process-data', async (event, data) => {
  try {
    const result = await processDataWithThreads(data);
    return { success: true, result };
  } catch (error) {
    console.error('Error processing data:', error);
    return { success: false, error: error.message };
  }
});

// Window control handlers
ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});

// Get app version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});