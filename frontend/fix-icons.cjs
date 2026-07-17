const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find all phosphor imports
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]@phosphor-icons\/react['"]/g;
  let match;
  let importedIcons = new Set();
  
  while ((match = importRegex.exec(content)) !== null) {
    const imports = match[1].split(',').map(s => s.trim()).filter(Boolean);
    for (const imp of imports) {
      if (imp.includes(' as ')) {
        const parts = imp.split(' as ');
        if (parts[0].trim() === 'User' && parts[1].trim() === 'UserIcon') {
          // Special case in RegisterPage.jsx: User as UserIcon. Let's handle it manually or skip
        }
      } else {
        importedIcons.add(imp);
      }
    }
  }

  if (importedIcons.size === 0) return;

  let newContent = content;

  for (const icon of importedIcons) {
    if (icon.endsWith('Icon')) continue;
    
    // Replace import
    const importRegex2 = new RegExp(`\\b${icon}\\b(?=[\\s,]*[},])`, 'g');
    newContent = newContent.replace(importRegex2, `${icon} as ${icon}Icon`);
    
    // Replace JSX opening tags
    const jsxOpenRegex = new RegExp(`<${icon}\\b`, 'g');
    newContent = newContent.replace(jsxOpenRegex, `<${icon}Icon`);
    
    // Replace JSX closing tags
    const jsxCloseRegex = new RegExp(`</${icon}\\b`, 'g');
    newContent = newContent.replace(jsxCloseRegex, `</${icon}Icon`);
    
    // Replace object properties like `icon: Bus` in Sidebar
    const objPropRegex = new RegExp(`\\bicon:\\s*${icon}\\b`, 'g');
    newContent = newContent.replace(objPropRegex, `icon: ${icon}Icon`);
  }

  // Handle 'User as UserIcon' edge case
  newContent = newContent.replace(/User as UserIcon as UserIconIcon/g, 'User as UserIcon');

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Done');
