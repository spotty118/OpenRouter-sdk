#!/usr/bin/env node

/**
 * This script addresses multiple TypeScript issues:
 * 1. Adds .js extensions to import paths
 * 2. Updates JSON imports to use 'with' instead of 'assert'
 * 3. Fixes imports with missing commas
 * 4. Updates interface paths
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Modules don't have __dirname, so we need to create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Promisified versions of fs functions
const readFileAsync = (path) => fs.promises.readFile(path, 'utf8');
const writeFileAsync = (path, data) => fs.promises.writeFile(path, data, 'utf8');
const readDirAsync = (path) => fs.promises.readdir(path);
const statAsync = (path) => fs.promises.stat(path);

async function fixIssues(filePath) {
  try {
    const content = await readFileAsync(filePath);
    let updatedContent = content;
    let changes = false;
    
    // Fix 1: Add .js extensions to relative imports
    updatedContent = updatedContent.replace(
      /from\s+['"]([^'"]*?)['"];/g, 
      (match, importPath) => {
        // Don't modify non-relative imports, absolute imports, or imports with extensions
        if (!importPath.startsWith('.') || 
            path.extname(importPath) !== '' || 
            importPath.includes('*')) {
          return match;
        }
        
        // Add .js extension for TypeScript files
        return `from '${importPath}.js';`;
      }
    );
    
    // Fix 2: Update JSON imports to use 'with' instead of 'assert'
    updatedContent = updatedContent.replace(
      /from\s+['"]([^'"]*\.json)['"](\s+assert\s+{\s*type\s*:\s*['"]json['"]\s*})/g,
      (match, jsonPath, assertClause) => {
        return `from '${jsonPath}' with { type: 'json' }`;
      }
    );
    
    // Fix 3: Fix JSON imports without assertion
    updatedContent = updatedContent.replace(
      /import\s+{([^}]*)}\s+from\s+['"]([^'"]*\.json)['"];/g,
      (match, imports, jsonPath) => {
        return `import ${imports} from '${jsonPath}' with { type: 'json' };`;
      }
    );
    
    // Fix 4: Fix export * statements to include .js extensions
    updatedContent = updatedContent.replace(
      /export\s+\*\s+from\s+['"]([^'"]*?)['"];/g,
      (match, importPath) => {
        // Don't modify non-relative exports, absolute exports, or exports with extensions
        if (!importPath.startsWith('.') || 
            path.extname(importPath) !== '' || 
            importPath.includes('*')) {
          return match;
        }
        
        // Add .js extension for TypeScript files
        return `export * from '${importPath}.js';`;
      }
    );
    
    // Fix 5: Fix imports with missing commas between identifiers
    updatedContent = updatedContent.replace(
      /import\s+{\s*([^}]*?)\s*}\s+from\s+['"]([^'"]*?)['"];/g,
      (match, imports, importPath) => {
        // Fix imports separated by spaces without commas
        const fixedImports = imports
          .replace(/([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)/g, '$1, $2')
          .trim();
        
        // Don't modify the path if it already has an extension
        if (path.extname(importPath) !== '') {
          return `import { ${fixedImports} } from '${importPath}';`;
        }
        
        // Add .js extension for relative imports
        if (importPath.startsWith('.')) {
          return `import { ${fixedImports} } from '${importPath}.js';`;
        }
        
        return `import { ${fixedImports} } from '${importPath}';`;
      }
    );
    
    // Fix 6: Fix interface paths (special case)
    if (filePath.includes('/interfaces/index.ts')) {
      console.log('  🔍 Fixing interfaces/index.ts');
      
      // Make sure all exports have .js extensions
      updatedContent = updatedContent.replace(
        /export\s+\*\s+from\s+['"]\.\/([^'"]*?)['"];/g,
        `export * from './$1.js';`
      );
    }
    
    // Fix 7: Fix module resolution for interfaces and utils
    updatedContent = updatedContent.replace(
      /from\s+['"]\.\.\/interfaces\.js['"];/g,
      `from '../interfaces/index.js';`
    );
    
    updatedContent = updatedContent.replace(
      /from\s+['"]\.\.\/utils\.js['"];/g,
      `from '../utils/index.js';`
    );
    
    updatedContent = updatedContent.replace(
      /from\s+['"]\.\.\/\.\.\/interfaces\.js['"];/g,
      `from '../../interfaces/index.js';`
    );
    
    // Fix 8: Fix any TypeScript specific issues
    // Add type annotations to parameters
    
    if (content !== updatedContent) {
      await writeFileAsync(filePath, updatedContent);
      console.log(`✅ Fixed issues in: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function findTsFiles(dir) {
  const files = [];
  
  // Read the directory contents
  const entries = await readDirAsync(dir);
  
  for (const entry of entries) {
    const entryPath = path.join(dir, entry);
    const stats = await statAsync(entryPath);
    
    if (stats.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
      // Recursively search directories
      const subFiles = await findTsFiles(entryPath);
      files.push(...subFiles);
    } else if (stats.isFile() && /\.(ts|tsx)$/.test(entry)) {
      // Add TypeScript files
      files.push(entryPath);
    }
  }
  
  return files;
}

async function fixTypeScriptConfig() {
  try {
    const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
    const tsConfig = JSON.parse(await readFileAsync(tsConfigPath));
    
    // Ensure the compilerOptions are correctly set for ES Modules
    tsConfig.compilerOptions = {
      ...tsConfig.compilerOptions,
      module: "NodeNext",
      moduleResolution: "NodeNext", 
      target: "ES2020",
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      resolveJsonModule: true,
      skipLibCheck: true  // Skip type checking of declaration files to avoid some issues
    };
    
    await writeFileAsync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    console.log('✅ Updated tsconfig.json');
    return true;
  } catch (error) {
    console.error('❌ Error updating tsconfig.json:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Finding TypeScript files...');
  const srcDir = path.join(process.cwd(), 'src');
  const tsFiles = await findTsFiles(srcDir);
  
  console.log(`📝 Found ${tsFiles.length} TypeScript files to process`);
  
  // Fix TypeScript configuration first
  await fixTypeScriptConfig();
  
  let fixedCount = 0;
  
  // Sort files to process interfaces first
  const sortedFiles = [...tsFiles].sort((a, b) => {
    if (a.includes('/interfaces/') && !b.includes('/interfaces/')) return -1;
    if (!a.includes('/interfaces/') && b.includes('/interfaces/')) return 1;
    return 0;
  });
  
  for (const file of sortedFiles) {
    const wasFixed = await fixIssues(file);
    if (wasFixed) fixedCount++;
  }
  
  console.log(`\n🎉 Fixed issues in ${fixedCount} of ${tsFiles.length} files`);
  console.log('\nNext steps:');
  console.log('1. Run "npm run build" to rebuild the project');
  console.log('2. If there are still errors, you may need to fix some manually');
}

// Run the script
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
