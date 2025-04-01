# Electron Base App

A comprehensive template for building Windows desktop applications using Electron and JavaScript.

## Features

- 🚀 Quick Start - Ready-to-use project configuration
- 📁 File Operations - Read, write and manage files
- 🎨 Modern UI - Clean and responsive design
- 🔒 Secure Architecture - Context isolation and secure IPC
- 🎛️ Custom title bar
- 🌓 Light/dark theme support

## Project Structure

```
electron-base-app/
├── src/                          # Application code
│   ├── main/                     # Backend (main process)
│   │   ├── main.js               # Main Node.js file
│   │   ├── preload.js            # Preload script
│   └── renderer/                 # Frontend (renderer process)
│       ├── index.html            # Main HTML file
│       ├── index.js              # Frontend JavaScript
│       └── styles/               # CSS styles
├── assets/                       # Assets (icons, images)
├── package.json                  # npm dependencies
└── README.md                     # Documentation
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/savisxss/Electron-Base-App.git
   cd Electron-Base-App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Run the application in development mode:
```bash
npm run start
```

For development mode with developer tools:
```bash
npm run dev
```

### Building the Application

Build the application for Windows:
```bash
npm run build
```

The built application will be available in the `dist` directory.

## Customizing the Application

### Application Name and ID

Edit the `package.json` file:
```json
{
  "name": "your-app-name",
  "productName": "Your App Name",
  "build": {
    "appId": "com.yourcompany.yourappid"
  }
}
```

### Application Icon

Replace the icon file in `assets/icon.ico` with your own icon.

### Adding Dependencies

Add Node.js dependencies:
```bash
npm install --save package-name
```

## Architecture Overview

### Main Process (Backend)

The main process (in `src/main/main.js`) is responsible for:
- Creating and managing application windows
- Accessing native OS features
- File system operations
- Inter-process communication (IPC)

### Renderer Process (Frontend)

The renderer process (in `src/renderer/`) is responsible for:
- User interface
- DOM manipulation
- Handling user input
- Communicating with the main process via IPC

### Preload Script

The preload script (in `src/main/preload.js`) provides:
- A secure bridge between the main and renderer processes
- Context isolation to prevent security issues
- Exposing only specific APIs to the renderer

## IPC Communication

### From Renderer to Main

```javascript
// In preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath)
});

// In main.js
ipcMain.handle('read-file', async (event, filePath) => {
  // Implementation
});

// In renderer
const fileContent = await window.electronAPI.readFile(filePath);
```

### From Main to Renderer

```javascript
// In main.js
mainWindow.webContents.send('update-available', { version: '1.1.0' });

// In preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_event, value) => callback(value));
  }
});

// In renderer
window.electronAPI.onUpdateAvailable((updateInfo) => {
  console.log('Update available:', updateInfo);
});
```

## License

[MIT](LICENSE)