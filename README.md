# Electron Base App with Node Threading

A comprehensive template for building Windows desktop applications using Electron and JavaScript, enhanced with powerful multithreading capabilities from the node-threading system.

## Features

- 🚀 Quick Start - Ready-to-use project configuration
- 🧵 Multithreading - Efficient handling of multiple Node.js worker threads
- 📊 Memory Monitoring - Real-time memory stats and optimization
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
│   │   └── node-threading/       # Node threading system (to be cloned)
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
- [Git](https://git-scm.com/) (for cloning the node-threading repository)

## Getting Started

### Installation

1. Clone the Electron Base App repository:
   ```bash
   git clone https://github.com/savisxss/Electron-Base-App.git
   cd Electron-Base-App
   ```

2. Clone the node-threading repository into the src/main directory:
   ```bash
   git clone https://github.com/savisxss/node-threading.git src/main/node-threading
   ```

3. Install dependencies:
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

## Node Threading Integration

This application integrates with the [node-threading](https://github.com/savisxss/node-threading) system to provide powerful multithreading capabilities for your desktop applications.

### Key Features from node-threading

- **Worker Threads Management**: Efficient handling of multiple Node.js worker threads
- **Virtual Memory System**: 8 managed memory stacks with automatic optimization
- **Smart Caching**: Virtual cache system with socket-based communication
- **Queue Buffer System**: Efficient data queueing and processing
- **Real-time Monitoring**: Advanced memory and performance monitoring
- **Colored Logging**: Comprehensive logging system with color-coded output
- **Health Checks**: Automatic system health monitoring and reporting

### Use Cases

The threading system is perfect for:

- **Data Processing Applications**: Analyze large datasets in the background
- **Media Processing Tools**: Handle image/video processing in separate threads
- **Scientific Applications**: Run complex calculations without blocking the UI
- **Monitoring Dashboards**: Collect and visualize real-time system metrics
- **Financial Applications**: Process large financial datasets and calculations
- **Development Tools**: Code compilation and static analysis

### Customizing Node Fragments

To use the threading system for your specific needs, modify the `NodeFragment.js` file in the node-threading directory. Here's an example of a custom processing function:

```javascript
// In NodeFragment.js
function fragmentEvaluate(fragmentId, data) {
    // Replace with your own processing logic
    switch (fragmentId) {
        case 1:
            return processImages(data);
        case 2:
            return analyzeData(data);
        case 3:
            return generateReport(data);
        case 4:
            return optimizeResults(data);
        default:
            throw new Error(`Invalid fragment ID: ${fragmentId}`);
    }
}

function processImages(data) {
    // Your image processing logic here
}

function analyzeData(data) {
    // Your data analysis logic here
}

function generateReport(data) {
    // Your report generation logic here
}

function optimizeResults(data) {
    // Your optimization logic here
}
```

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
- Initializing and controlling the threading system
- Accessing native OS features
- File system operations
- Inter-process communication (IPC)

### Renderer Process (Frontend)

The renderer process (in `src/renderer/`) is responsible for:
- User interface
- DOM manipulation
- Handling user input
- Displaying threading system statistics
- Communicating with the main process via IPC

### Preload Script

The preload script (in `src/main/preload.js`) provides:
- A secure bridge between the main and renderer processes
- Context isolation to prevent security issues
- Exposing only specific APIs to the renderer

## IPC Communication

### Threading System Examples

```javascript
// In main.js (main process)
ipcMain.handle('process-data', async (event, data) => {
  const result = await processDataWithThreads(data);
  return { success: true, result };
});

// In renderer (through preload.js)
const result = await window.electronAPI.processData({
  data: 'Test data',
  timestamp: Date.now()
});
```

### Memory Stats Examples

```javascript
// In main.js (main process)
function getMemoryStats() {
  const stats = [];
  for (let i = 1; i <= 8; i++) {
    const report = MemoryMonitor.generateReport(i);
    if (report) stats.push(report);
  }
  return { success: true, stats };
}

// In renderer (through preload.js)
window.electronAPI.onMemoryStatsUpdate(data => {
  // Update UI with memory stats
  updateMemoryStatsUI(data);
});
```

## License

[MIT](LICENSE)