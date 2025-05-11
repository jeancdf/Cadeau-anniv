const fs = require('fs');
const path = require('path');
const packageJsonPath = path.join(__dirname, 'package.json');

// Read the package.json file
try {
  const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Get the current version
  const currentVersion = packageData.version;
  
  // Parse version components
  let [major, minor, patch] = currentVersion.split('.').map(Number);
  
  // Increment the patch version
  patch += 1;
  
  // Create the new version string
  const newVersion = `${major}.${minor}.${patch}`;
  
  // Update the version in the package data
  packageData.version = newVersion;
  
  // Write the updated package.json
  fs.writeFileSync(
    packageJsonPath, 
    JSON.stringify(packageData, null, 2) + '\n',
    'utf8'
  );
  
  console.log(`✅ Version updated: ${currentVersion} → ${newVersion}`);

  // Create or update version info file for the application
  const versionInfo = {
    version: newVersion,
    buildDate: new Date().toISOString(),
    buildNumber: patch
  };

  // Ensure directories exist
  const environmentsPath = path.join(__dirname, 'src', 'environments');
  if (!fs.existsSync(environmentsPath)) {
    fs.mkdirSync(environmentsPath, { recursive: true });
  }

  const assetsPath = path.join(__dirname, 'src', 'assets');
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }

  // Also ensure public/assets directory exists for development mode
  const publicAssetsPath = path.join(__dirname, 'public', 'assets');
  if (!fs.existsSync(publicAssetsPath)) {
    fs.mkdirSync(publicAssetsPath, { recursive: true });
  }

  // Save to environments folder
  const envVersionFilePath = path.join(environmentsPath, 'version.json');
  fs.writeFileSync(
    envVersionFilePath,
    JSON.stringify(versionInfo, null, 2) + '\n',
    'utf8'
  );
  
  // Save to src/assets folder for runtime access
  const assetsVersionFilePath = path.join(assetsPath, 'version.json');
  fs.writeFileSync(
    assetsVersionFilePath,
    JSON.stringify(versionInfo, null, 2) + '\n',
    'utf8'
  );
  
  // Save to public/assets folder for development runtime access
  const publicVersionFilePath = path.join(publicAssetsPath, 'version.json');
  fs.writeFileSync(
    publicVersionFilePath,
    JSON.stringify(versionInfo, null, 2) + '\n',
    'utf8'
  );
  
  console.log(`✅ Version info created at:
  - ${envVersionFilePath}
  - ${assetsVersionFilePath}
  - ${publicVersionFilePath}`);
  
} catch (error) {
  console.error('⚠️ Error updating version:', error);
  process.exit(1);
} 