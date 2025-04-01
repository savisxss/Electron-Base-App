const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', { filePath, content }),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Subscribe to events
  onUpdateAvailable: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('update-available', subscription);
    
    // Return a function to unsubscribe
    return () => {
      ipcRenderer.removeListener('update-available', subscription);
    };
  }
});

// You can also expose some Node.js modules or utilities if needed
contextBridge.exposeInMainWorld('utilities', {
  // For example, expose the path module for working with file paths
  joinPath: (...args) => require('path').join(...args),
  
  // Expose the current platform
  platform: process.platform
});