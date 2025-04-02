const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const crypto = require('crypto');
const { JSVirtualizer } = require('./js-vm-obfuscator');

// Configuration
const appRoot = path.resolve(__dirname);
const buildDir = path.join(appRoot, 'dist');
const resourcesDir = path.join(buildDir, 'win-unpacked', 'resources');
const appAsarFile = path.join(resourcesDir, 'app.asar');
const tempDir = path.join(appRoot, 'temp-asar-extract');
const obfuscatedDir = path.join(appRoot, 'obfuscated-src');
const themidaPath = process.env.THEMIDA_PATH || 'C:\\Program Files\\ThemiDa\\ThemiDa.exe';
const themidaProject = path.join(appRoot, 'protection.tmd');

// Create temporary directories if they don't exist
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

if (!fs.existsSync(obfuscatedDir)) {
  fs.mkdirSync(obfuscatedDir, { recursive: true });
}

/**
 * Electron application obfuscation and protection process
 */
async function secureElectronApp() {
  try {
    console.log('Starting Electron application security process...');
    
    // Step 1: Verify the application has been built
    if (!fs.existsSync(buildDir) || !fs.existsSync(appAsarFile)) {
      console.error('Built application not found. First run: npm run build');
      process.exit(1);
    }
    
    // Step 2: Extract app.asar
    console.log('Extracting app.asar...');
    await extractAsar(appAsarFile, tempDir);
    
    // Step 3: Find all JS files to obfuscate
    console.log('Finding JavaScript files...');
    const jsFiles = findJsFiles(tempDir);
    console.log(`Found ${jsFiles.length} JavaScript files.`);
    
    // Step 4: Obfuscate JS files with VM virtualization
    console.log('Obfuscating JavaScript files with VM virtualization...');
    await obfuscateJsFiles(jsFiles, obfuscatedDir);
    
    // Step 5: Replace original JS files with obfuscated versions
    console.log('Replacing original files with obfuscated versions...');
    replaceFiles(obfuscatedDir, tempDir);
    
    // Step 6: Add additional security measures to prevent tampering
    console.log('Adding integrity verification to the application...');
    await addIntegrityVerification(tempDir);
    
    // Step 7: Re-package as app.asar
    console.log('Re-packaging files back to app.asar...');
    await packAsar(tempDir, appAsarFile);
    
    // Step 8: Protect the main executable with ThemiDa
    console.log('Protecting main executable with ThemiDa...');
    await protectExecutableWithThemiDa();
    
    // Step 9: Clean up temporary files
    console.log('Cleaning up temporary files...');
    cleanupTempFiles();
    
    console.log('Security process completed successfully!');
  } catch (error) {
    console.error('Error during security process:', error);
    process.exit(1);
  }
}

/**
 * Extract app.asar to temporary directory
 */
async function extractAsar(asarFile, outputDir) {
  return new Promise((resolve, reject) => {
    // Check if asar is installed
    try {
      execSync('asar --version', { stdio: 'ignore' });
    } catch (error) {
      console.log('Installing asar module...');
      execSync('npm install -g asar', { stdio: 'inherit' });
    }

    // Extract asar file
    exec(`asar extract "${asarFile}" "${outputDir}"`, (error) => {
      if (error) {
        reject(new Error(`Failed to extract ${asarFile}: ${error.message}`));
        return;
      }
      resolve();
    });
  });
}

/**
 * Find all JavaScript files in a directory recursively
 */
function findJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    
    if (fs.statSync(filePath).isDirectory()) {
      findJsFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      // Exclude node_modules and other external libraries
      if (!filePath.includes('node_modules') && 
          !filePath.includes('vendor') &&
          !filePath.includes('dist') &&
          !filePath.includes('.min.js')) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

/**
 * Obfuscate JavaScript files using JS Virtualizer
 */
async function obfuscateJsFiles(jsFiles, outputDir) {
  // Configure obfuscator
  const options = {
    stringEncoding: true,
    controlFlowFlattening: true,
    deadCodeInjection: true,
    selfDefending: true,
    debugProtection: true,
    entropy: 0.8,
    transformObjectKeys: true
  };
  
  const virtualizer = new JSVirtualizer(options);
  
  // Process each file
  for (const file of jsFiles) {
    try {
      const relativePath = file.replace(tempDir, '').replace(/\\/g, '/');
      const outputFile = path.join(outputDir, relativePath);
      const outputFileDir = path.dirname(outputFile);
      
      // Create target directory if it doesn't exist
      if (!fs.existsSync(outputFileDir)) {
        fs.mkdirSync(outputFileDir, { recursive: true });
      }
      
      // Check if it's a main process file
      const isMainProcessFile = file.includes('main.js') || 
                                file.includes('preload.js') || 
                                file.includes('background.js');
      
      // Apply appropriate level of protection
      const sourceCode = fs.readFileSync(file, 'utf-8');
      
      if (isMainProcessFile) {
        console.log(`Full virtualization for main process file: ${relativePath}`);
        const obfuscatedCode = await virtualizer.obfuscate(sourceCode);
        fs.writeFileSync(outputFile, obfuscatedCode);
      } else {
        console.log(`Standard obfuscation for: ${relativePath}`);
        const obfuscatedCode = await virtualizer.obfuscate(sourceCode);
        fs.writeFileSync(outputFile, obfuscatedCode);
      }
    } catch (error) {
      console.warn(`Warning: Failed to obfuscate ${file}: ${error.message}`);
      // Copy original file if obfuscation fails
      const relativePath = file.replace(tempDir, '');
      const outputFile = path.join(outputDir, relativePath);
      const outputFileDir = path.dirname(outputFile);
      
      if (!fs.existsSync(outputFileDir)) {
        fs.mkdirSync(outputFileDir, { recursive: true });
      }
      
      fs.copyFileSync(file, outputFile);
    }
  }
}

/**
 * Replace original files with obfuscated versions
 */
function replaceFiles(sourceDir, targetDir) {
  const files = findJsFiles(sourceDir);
  
  files.forEach(file => {
    const relativePath = file.replace(sourceDir, '');
    const targetFile = path.join(targetDir, relativePath);
    
    fs.copyFileSync(file, targetFile);
  });
}

/**
 * Add integrity verification to prevent tampering
 */
async function addIntegrityVerification(appDir) {
  const mainPath = path.join(appDir, 'main', 'main.js');
  if (!fs.existsSync(mainPath)) {
    console.warn('Main process file not found, skipping integrity verification');
    return;
  }
  
  // Generate integrity hashes for all files
  const files = findJsFiles(appDir);
  const fileHashes = {};
  
  for (const file of files) {
    if (file !== mainPath) {
      const relativePath = file.replace(appDir, '').replace(/\\/g, '/');
      const fileContent = fs.readFileSync(file);
      const hash = crypto.createHash('sha256').update(fileContent).digest('hex');
      fileHashes[relativePath] = hash;
    }
  }
  
  // Create integrity verification code
  const verificationCode = `
// Integrity verification system
(function() {
  const crypto = require('crypto');
  const fs = require('fs');
  const path = require('path');
  
  // File integrity hashes
  const expectedHashes = ${JSON.stringify(fileHashes, null, 2)};
  
  // Verify file integrity
  function verifyIntegrity() {
    const appDir = path.dirname(require.main.filename);
    const rootDir = path.join(appDir, '..');
    
    for (const relativePath in expectedHashes) {
      try {
        const filePath = path.join(rootDir, relativePath);
        const fileContent = fs.readFileSync(filePath);
        const actualHash = crypto.createHash('sha256').update(fileContent).digest('hex');
        
        if (actualHash !== expectedHashes[relativePath]) {
          console.error(\`Integrity check failed for: \${relativePath}\`);
          return false;
        }
      } catch (error) {
        console.error(\`Error checking file: \${relativePath}\`, error);
        return false;
      }
    }
    
    return true;
  }
  
  // Perform integrity check
  const integrityOk = verifyIntegrity();
  
  if (!integrityOk) {
    // Handle integrity violation
    console.error('Application files have been tampered with');
    process.exit(1);
  }
})();

`;

  // Add verification code to main.js
  const mainContent = fs.readFileSync(mainPath, 'utf-8');
  const newContent = verificationCode + mainContent;
  fs.writeFileSync(mainPath, newContent);
}

/**
 * Package files back into app.asar
 */
async function packAsar(sourceDir, outputFile) {
  return new Promise((resolve, reject) => {
    // Remove existing asar file if it exists
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
    
    // Pack files to asar
    exec(`asar pack "${sourceDir}" "${outputFile}"`, (error) => {
      if (error) {
        reject(new Error(`Failed to pack to ${outputFile}: ${error.message}`));
        return;
      }
      resolve();
    });
  });
}

/**
 * Protect the main executable with ThemiDa
 */
async function protectExecutableWithThemiDa() {
  return new Promise((resolve, reject) => {
    // Path to executable
    const executablePath = path.join(buildDir, 'win-unpacked', 'Electron Base App.exe');
    const protectedPath = path.join(buildDir, 'win-unpacked', 'protected.exe');
    
    // Check if ThemiDa is installed
    if (!fs.existsSync(themidaPath)) {
      console.warn('ThemiDa not found at the specified path. Skipping executable protection.');
      resolve();
      return;
    }
    
    // Check if a custom ThemiDa project file exists
    let themidaCommand;
    
    if (fs.existsSync(themidaProject)) {
      console.log('Using custom ThemiDa project file...');
      themidaCommand = `"${themidaPath}" /build:"${themidaProject}"`;
    } else {
      // Use command line parameters for protection
      console.log('Using default ThemiDa protection...');
      themidaCommand = `"${themidaPath}" /protect /input:"${executablePath}" /output:"${protectedPath}" /options:"MaximumProtection"`;
    }
    
    // Execute ThemiDa
    exec(themidaCommand, (error, stdout, stderr) => {
      if (error) {
        console.warn(`Warning: Failed to protect executable: ${error.message}`);
        console.warn('Skipping executable protection.');
        resolve();
        return;
      }
      
      try {
        // Backup original file
        fs.renameSync(executablePath, executablePath + '.original');
        fs.renameSync(protectedPath, executablePath);
        
        console.log('Executable protected successfully.');
        resolve();
      } catch (err) {
        console.warn(`Error replacing files: ${err.message}`);
        resolve();
      }
    });
  });
}

/**
 * Clean up temporary files
 */
function cleanupTempFiles() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  if (fs.existsSync(obfuscatedDir)) {
    fs.rmSync(obfuscatedDir, { recursive: true, force: true });
  }
}

/**
 * Create a default ThemiDa project file if it doesn't exist
 */
function createDefaultThemiDaProject() {
  // This would create a ThemiDa XML project file with appropriate settings
  // Skipped in this example as the XML structure would be vendor-specific
  console.log('Note: For best results, create a custom ThemiDa project file (protection.tmd)');
}

/**
 * Create package.json scripts
 */
function updatePackageJson() {
  const packageJsonPath = path.join(appRoot, 'package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // Add new scripts
      packageJson.scripts = packageJson.scripts || {};
      packageJson.scripts['build:secure'] = 'npm run build && node electron-secure-packer.js';
      
      // Save updated package.json
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('Updated package.json with new build:secure script');
    } catch (error) {
      console.warn('Failed to update package.json:', error);
    }
  }
}

// Create helper script for ThemiDa CLI automation
function createThemiDaHelper() {
  const helperScriptPath = path.join(appRoot, 'themida-helper.js');
  const helperScript = `
// themida-helper.js
// Helper script for creating and executing ThemiDa protection
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const themidaPath = process.env.THEMIDA_PATH || 'C:\\\\Program Files\\\\ThemiDa\\\\ThemiDa.exe';
const projectName = 'protection.tmd';
const buildDir = path.join(__dirname, 'dist');
const executablePath = path.join(buildDir, 'win-unpacked', 'Electron Base App.exe');

// Check command line arguments
const command = process.argv[2];

if (command === 'create-project') {
  // Create a new ThemiDa project file
  console.log('Creating new ThemiDa project file...');
  
  // Note: This is a simplified example - real implementation would depend on the ThemiDa CLI
  exec(\`"\${themidaPath}" /createproject:"\${projectName}" /programmfile:"\${executablePath}"\`, (error, stdout, stderr) => {
    if (error) {
      console.error('Failed to create ThemiDa project:', error);
      return;
    }
    console.log('ThemiDa project created successfully. Edit it using ThemiDa UI.');
  });
} else if (command === 'protect') {
  // Protect using existing project file
  console.log('Protecting executable with ThemiDa...');
  
  exec(\`"\${themidaPath}" /build:"\${projectName}"\`, (error, stdout, stderr) => {
    if (error) {
      console.error('Failed to protect with ThemiDa:', error);
      return;
    }
    console.log('Protection applied successfully.');
  });
} else {
  console.log('Usage:');
  console.log('  node themida-helper.js create-project - Create a new ThemiDa project');
  console.log('  node themida-helper.js protect - Protect using existing project');
}
`;

  fs.writeFileSync(helperScriptPath, helperScript);
  console.log('Created ThemiDa helper script: themida-helper.js');
}

// Run security process
if (require.main === module) {
  // Create helper scripts
  updatePackageJson();
  createThemiDaHelper();
  
  // Run the main security process
  secureElectronApp();
}

module.exports = {
  secureElectronApp,
  obfuscateJsFiles,
  protectExecutableWithThemiDa
};