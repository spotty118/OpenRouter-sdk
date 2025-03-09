#!/usr/bin/env node

/**
 * This script adds .js extensions to TypeScript import statements
 * and fixes other import issues related to ES modules
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

async function addJsExtensionsToImports(filePath) {
  try {
    const content = await readFileAsync(filePath);
    
    // Fix relative imports in TypeScript files
    let updatedContent = content.replace(
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
    
    // Fix JSON imports to use import attributes with 'with' instead of 'assert'
    updatedContent = updatedContent.replace(
      /import\s+{([^}]*)}\s+from\s+['"]([^'"]*\.json)['"](\s+assert\s+{\s*type:\s*['"]json['"]\s*});/g,
      (match, imports, jsonPath, assertion) => {
        return `import ${imports} from '${jsonPath}' with { type: 'json' };`;
      }
    );
    
    // Fix unprocessed JSON imports (in case the previous regex didn't match)
    updatedContent = updatedContent.replace(
      /import\s+{([^}]*)}\s+from\s+['"]([^'"]*\.json)['"];/g,
      (match, imports, jsonPath) => {
        return `import ${imports} from '${jsonPath}' with { type: 'json' };`;
      }
    );
    
    // Fix export * statements to include .js extensions
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
    
    // Fix comma-separated imports on a single line
    updatedContent = updatedContent.replace(
      /import\s+{\s*([^}]*?)\s*}\s+from\s+['"]([^'"]*?)['"];/g,
      (match, imports, importPath) => {
        // Don't modify imports with extensions
        if (!importPath.startsWith('.') || path.extname(importPath) !== '') {
          return match;
        }
        
        // Fix imports separated by spaces without commas
        const fixedImports = imports
          .replace(/([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)/g, '$1, $2')
          .trim();
        
        return `import { ${fixedImports} } from '${importPath}.js';`;
      }
    );
    
    if (content !== updatedContent) {
      await writeFileAsync(filePath, updatedContent);
      console.log(`✅ Fixed imports in: ${filePath}`);
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

async function main() {
  console.log('🔍 Finding TypeScript files...');
  const srcDir = path.join(process.cwd(), 'src');
  const tsFiles = await findTsFiles(srcDir);
  
  console.log(`📝 Found ${tsFiles.length} TypeScript files to process`);
  
  let fixedCount = 0;
  
  for (const file of tsFiles) {
    const wasFixed = await addJsExtensionsToImports(file);
    if (wasFixed) fixedCount++;
  }
  
  console.log(`\n🎉 Fixed imports in ${fixedCount} of ${tsFiles.length} files`);
  console.log('\nNext steps:');
  console.log('1. Run "npm run build" to rebuild the project');
  console.log('2. If there are still import errors, you may need to fix some manually');
}

// Run the script
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
