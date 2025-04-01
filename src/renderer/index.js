// Main JavaScript file for the renderer process
document.addEventListener('DOMContentLoaded', () => {
    // Initialize application
    initApp();
  });
  
  // Application initialization function
  async function initApp() {
    // Initialize window controls
    initWindowControls();
    
    // Initialize navigation
    initNavigation();
    
    // Initialize views
    initDashboard();
    initContent();
    initFiles();
    initSettings();
    
    // Initialize threading specific UI
    initThreadingView();
    
    // Get and display app version
    updateAppVersion();
    
    // Apply saved theme if available
    applyTheme();
  }
  
  // Initialize window control buttons
  function initWindowControls() {
    document.getElementById('minimize-btn').addEventListener('click', () => {
      window.electronAPI.minimizeWindow();
    });
    
    document.getElementById('maximize-btn').addEventListener('click', () => {
      window.electronAPI.maximizeWindow();
    });
    
    document.getElementById('close-btn').addEventListener('click', () => {
      window.electronAPI.closeWindow();
    });
  }
  
  // Initialize navigation between views
  function initNavigation() {
    const menuItems = document.querySelectorAll('.sidebar-nav li');
    
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        // Remove active class from all menu items
        menuItems.forEach(i => i.classList.remove('active'));
        
        // Add active class to clicked item
        item.classList.add('active');
        
        // Get view to activate
        const viewId = item.getAttribute('data-view');
        
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
          view.classList.remove('active-view');
        });
        
        // Show selected view
        document.getElementById(`${viewId}-view`).classList.add('active-view');
      });
    });
  }
  
  // Update app version information
  async function updateAppVersion() {
    try {
      const version = await window.electronAPI.getAppVersion();
      document.getElementById('app-version').textContent = `v${version}`;
      document.getElementById('about-version').textContent = version;
    } catch (error) {
      console.error('Error getting app version:', error);
    }
  }
  
  // Initialize Dashboard view
  function initDashboard() {
    document.getElementById('open-file-btn').addEventListener('click', async () => {
      try {
        const filePath = await window.electronAPI.openFileDialog();
        if (filePath) {
          const content = await window.electronAPI.readFile(filePath);
          showToast(`Opened file: ${filePath}`);
          console.log('File content:', content);
        }
      } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
      }
    });
    
    document.getElementById('show-info-btn').addEventListener('click', () => {
      showToast('Electron Base App with node-threading integration');
    });
  }
  
  // Initialize Content view
  function initContent() {
    const contentEditor = document.getElementById('content-editor');
    
    // Load saved content if available
    const savedContent = localStorage.getItem('app-content');
    if (savedContent) {
      contentEditor.value = savedContent;
    }
    
    // Save content button
    document.getElementById('save-content-btn').addEventListener('click', () => {
      localStorage.setItem('app-content', contentEditor.value);
      showToast('Content saved!');
    });
    
    // Clear content button
    document.getElementById('clear-content-btn').addEventListener('click', () => {
      contentEditor.value = '';
      localStorage.removeItem('app-content');
      showToast('Content cleared!');
    });
  }
  
  // Initialize Files view
  function initFiles() {
    let currentFilePath = null;
    const fileContent = document.getElementById('file-content');
    const filePath = document.getElementById('file-path');
    
    // Open file button
    document.getElementById('file-open-btn').addEventListener('click', async () => {
      try {
        const path = await window.electronAPI.openFileDialog();
        if (path) {
          const content = await window.electronAPI.readFile(path);
          fileContent.value = content;
          filePath.textContent = path;
          currentFilePath = path;
          
          // Add to recent files (in a real app, you'd persist this)
          addToRecentFiles(path);
          
          showToast(`Opened file: ${path}`);
        }
      } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
      }
    });
    
    // Save file button
    document.getElementById('file-save-btn').addEventListener('click', async () => {
      if (!currentFilePath) {
        showToast('No file selected to save', 'error');
        return;
      }
      
      try {
        await window.electronAPI.writeFile(currentFilePath, fileContent.value);
        showToast(`Saved file: ${currentFilePath}`);
      } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
      }
    });
    
    // Function to add a file to recent files list
    function addToRecentFiles(path) {
      const recentFilesList = document.getElementById('recent-files-list');
      
      // Clear "no files" message if it exists
      const noFilesMsg = recentFilesList.querySelector('.no-files-message');
      if (noFilesMsg) {
        recentFilesList.innerHTML = '';
      }
      
      // Create file item element
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      
      // Get filename from path
      const filename = path.split(/[\\/]/).pop();
      
      fileItem.innerHTML = `
        <div class="file-icon">📄</div>
        <div class="file-details">
          <div class="file-name">${filename}</div>
          <div class="file-path">${path}</div>
        </div>
      `;
      
      // Add click event to open the file
      fileItem.addEventListener('click', async () => {
        try {
          const content = await window.electronAPI.readFile(path);
          fileContent.value = content;
          filePath.textContent = path;
          currentFilePath = path;
        } catch (error) {
          showToast(`Error: ${error.message}`, 'error');
        }
      });
      
      // Add to the list (at the beginning)
      recentFilesList.insertBefore(fileItem, recentFilesList.firstChild);
      
      // Limit to a reasonable number, e.g., 5
      const items = recentFilesList.querySelectorAll('.file-item');
      if (items.length > 5) {
        recentFilesList.removeChild(items[items.length - 1]);
      }
    }
  }
  
  // Initialize Settings view
  function initSettings() {
    const themeSelect = document.getElementById('theme-select');
    const startWithWindows = document.getElementById('start-with-windows');
    const autoUpdate = document.getElementById('auto-update');
    const languageSelect = document.getElementById('language-select');
    
    // Load saved settings
    function loadSettings() {
      // Get settings from localStorage
      const settings = JSON.parse(localStorage.getItem('app-settings') || '{}');
      
      // Apply settings to form controls
      themeSelect.value = settings.theme || 'light';
      startWithWindows.checked = settings.startWithWindows || false;
      autoUpdate.checked = settings.autoUpdate !== false; // Default to true
      languageSelect.value = settings.language || 'en';
    }
    
    // Save settings
    function saveSettings() {
      const settings = {
        theme: themeSelect.value,
        startWithWindows: startWithWindows.checked,
        autoUpdate: autoUpdate.checked,
        language: languageSelect.value
      };
      
      // Save to localStorage
      localStorage.setItem('app-settings', JSON.stringify(settings));
      
      // Apply theme
      document.documentElement.setAttribute('data-theme', themeSelect.value);
      
      showToast('Settings saved!');
    }
    
    // Reset settings to defaults
    function resetSettings() {
      themeSelect.value = 'light';
      startWithWindows.checked = false;
      autoUpdate.checked = true;
      languageSelect.value = 'en';
      
      // Apply theme
      document.documentElement.setAttribute('data-theme', 'light');
      
      // Save these defaults
      saveSettings();
      
      showToast('Settings reset to defaults!');
    }
    
    // Event listeners
    document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
    document.getElementById('reset-settings-btn').addEventListener('click', resetSettings);
    
    // Live theme change
    themeSelect.addEventListener('change', () => {
      document.documentElement.setAttribute('data-theme', themeSelect.value);
    });
    
    // Load settings on init
    loadSettings();
  }
  
  // Initialize Threading view
  function initThreadingView() {
    const memoryStatsContainer = document.getElementById('memory-stats-container');
    const processResultContainer = document.getElementById('process-result-container');
    const processButton = document.getElementById('process-data-btn');
    
    // Set up memory stats update listener
    const unsubscribe = window.electronAPI.onMemoryStatsUpdate(data => {
      updateMemoryStatsUI(data);
    });
    
    // Initial memory stats load
    window.electronAPI.getMemoryStats().then(data => {
      updateMemoryStatsUI(data);
    }).catch(error => {
      console.error('Error getting memory stats:', error);
    });
    
    // Process data button click handler
    if (processButton) {
      processButton.addEventListener('click', async () => {
        try {
          processButton.disabled = true;
          processButton.textContent = 'Processing...';
          
          const result = await window.electronAPI.processData({
            data: 'Test data to process',
            timestamp: Date.now()
          });
          
          if (result.success) {
            updateProcessResultUI(result.result);
            showToast('Data processed successfully!', 'success');
          } else {
            showToast(`Error processing data: ${result.error}`, 'error');
          }
        } catch (error) {
          showToast(`Error: ${error.message}`, 'error');
        } finally {
          processButton.disabled = false;
          processButton.textContent = 'Process Data';
        }
      });
    }
    
    // Update memory stats UI
    function updateMemoryStatsUI(data) {
      if (!memoryStatsContainer) return;
      
      if (data.error) {
        memoryStatsContainer.innerHTML = `<div class="error-message">Error loading memory stats: ${data.error}</div>`;
        return;
      }
      
      if (!data.success || !data.stats || !Array.isArray(data.stats)) {
        memoryStatsContainer.innerHTML = '<div class="error-message">No memory stats available</div>';
        return;
      }
      
      memoryStatsContainer.innerHTML = '';
      
      data.stats.forEach(stack => {
        const stackElement = document.createElement('div');
        stackElement.className = `memory-stack-card ${stack.health.status}`;
        
        stackElement.innerHTML = `
          <div class="stack-header">
            <h3>Stack #${stack.stackId}</h3>
            <span class="stack-status ${stack.health.status}">${stack.health.status}</span>
          </div>
          <div class="stack-details">
            <div class="stack-metric">
              <span class="metric-label">Memory:</span>
              <span class="metric-value">${stack.details.memory.currentSize} / ${stack.details.memory.peakSize}</span>
            </div>
            <div class="stack-metric">
              <span class="metric-label">Operations:</span>
              <span class="metric-value">${stack.details.operations.reads + stack.details.operations.writes}</span>
            </div>
            <div class="stack-metric">
              <span class="metric-label">Error Rate:</span>
              <span class="metric-value">${(stack.health.errorRate * 100).toFixed(2)}%</span>
            </div>
          </div>
        `;
        
        memoryStatsContainer.appendChild(stackElement);
      });
    }
    
    // Update process result UI
    function updateProcessResultUI(result) {
      if (!processResultContainer) return;
      
      processResultContainer.innerHTML = `
        <div class="result-card">
          <h3>Processing Result</h3>
          <div class="result-content">${result}</div>
          <div class="result-timestamp">Processed at: ${new Date().toLocaleTimeString()}</div>
        </div>
      `;
    }
  }
  
  // Apply theme from settings
  function applyTheme() {
    const settings = JSON.parse(localStorage.getItem('app-settings') || '{}');
    document.documentElement.setAttribute('data-theme', settings.theme || 'light');
  }
  
  // Show toast notification
  function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }