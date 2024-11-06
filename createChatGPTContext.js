const fs = require('fs');
const path = require('path');
const ignore = require('ignore');

// ====================
// Configuration Settings
// ====================

// Toggle between processing all files or specific file types
const processAllFiles = true; // Set to `true` to process all files, `false` to process specific extensions

// Define target file extensions (used only if `processAllFiles` is `false`)
const TARGET_EXTENSIONS = ['.html', '.js'];

// Define sensitive files and patterns to exclude
const SENSITIVE_FILES = [
  '.env', '.npmrc', '.yarnrc', '.credentials', '.aws', '.gcp', '.azure',
  '*.sqlite', '*.sqlite3', '*.db', '*.db-journal', '*.sql', '*.bak',
  '*.pem', '*.key', '*.crt', '*.csr', 'secrets.json'
];

// Define directories to exclude
const EXCLUDE_DIRS = [
  '.git', '.hg', '.svn', '.bzr', 'node_modules', 'vendor',
  'bower_components', '__pycache__', 'dist', 'build', '.cache',
  'out', 'target', '.next', '.nuxt', '.idea', '.vscode',
  '.history', '.sass-cache', '.pytest_cache'
];

// Define additional files to exclude
const EXCLUDE_FILES = [
  '.DS_Store', 'Thumbs.db', '*.log', '*.log.*',
  '*.bak', '*.swp', '*.tmp', '*~', "package-lock.json", "package.json"
];

// ====================
// Helper Functions
// ====================

/**
 * Initialize and get ignore patterns.
 * Combines .gitignore with predefined exclusion lists.
 * @param {string} dir - The base directory.
 * @returns {ignore.Ignore} - Configured ignore instance.
 */
function getIgnorePatterns(dir) {
  const ig = ignore();
  const gitignorePath = path.join(dir, '.gitignore');

  // Load .gitignore if it exists
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    ig.add(gitignoreContent);
  }

  // Add predefined exclusion patterns
  ig.add([...EXCLUDE_DIRS, ...SENSITIVE_FILES, ...EXCLUDE_FILES]);

  return ig;
}

/**
 * Check if the file should be processed based on configuration.
 * @param {string} file - Filename to check.
 * @returns {boolean} - True if file should be processed.
 */
function shouldProcessFile(file) {
  if (processAllFiles) {
    return true;
  }
  const fileExt = path.extname(file).toLowerCase();
  return TARGET_EXTENSIONS.includes(fileExt);
}

/**
 * Detect if a file is binary.
 * @param {string} filePath - Path to the file.
 * @returns {boolean} - True if the file is binary, false otherwise.
 */
function isBinaryFile(filePath) {
  const maxBytes = 8000; // Maximum number of bytes to read for detection
  const buffer = fs.readFileSync(filePath, { encoding: null, flag: 'r' });
  const bytesToCheck = Math.min(buffer.length, maxBytes);
  let nonTextBytes = 0;

  for (let i = 0; i < bytesToCheck; i++) {
    const byte = buffer[i];
    // If null byte found, it's binary
    if (byte === 0) {
      return true;
    }
    // Check for non-printable characters (excluding common whitespace)
    if ((byte < 7 || (byte > 14 && byte < 32)) && byte !== 9 && byte !== 10 && byte !== 13) {
      nonTextBytes++;
    }
  }

  const ratio = nonTextBytes / bytesToCheck;
  return ratio > 0.3; // If more than 30% non-text bytes, consider binary
}

/**
 * Recursively build the directory structure, excluding ignored files/directories and binary files.
 * @param {string} dir - Current directory path.
 * @param {object} fileStructure - Accumulator for directory structure.
 * @param {string} parentPath - Relative path from base directory.
 * @param {ignore.Ignore} ig - Configured ignore instance.
 * @returns {object} - Updated directory structure.
 */
function getDirectoryStructure(dir, fileStructure = {}, parentPath = '', ig) {
  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const relativePath = path.relative(process.cwd(), fullPath);

    // Skip ignored files/directories
    if (ig.ignores(relativePath)) {
      return;
    }

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      fileStructure[item] = {};
      getDirectoryStructure(fullPath, fileStructure[item], path.join(parentPath, item), ig);
    } else if (shouldProcessFile(item)) {
      // Skip binary files
      if (isBinaryFile(fullPath)) {
        console.warn(`Skipping binary file: ${relativePath}`);
        return;
      }

      fileStructure[item] = {
        path: fullPath,
        relativePath: path.join(parentPath, item),
        size: stats.size,
        lastModified: stats.mtime
      };
    }
  });

  return fileStructure;
}

/**
 * Remove extra whitespace from text.
 * @param {string} text - Text to process.
 * @returns {string} - Processed text.
 */
function removeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Remove comments from JavaScript code.
 * Preserves strings and regex patterns.
 * @param {string} text - JavaScript code.
 * @returns {string} - Code without comments.
 */
function removeComments(text) {
  const singleLineCommentPattern = /\/\/.*(?=[\n\r]|$)/g;
  const multiLineCommentPattern = /\/\*[\s\S]*?\*\//g;
  const stringPattern = /(['"`])(?:(?!\1|\\).|\\.)*\1/g;
  const regexPattern = /\/(?!\*)[^/\\\n]+\/[gimsuy]*/g;

  // Preserve strings and regex to avoid removing comment-like patterns within them
  const preservedItems = [];
  let preservedText = text
    .replace(stringPattern, match => {
      preservedItems.push(match);
      return `__PRESERVED__${preservedItems.length - 1}__`;
    })
    .replace(regexPattern, match => {
      preservedItems.push(match);
      return `__PRESERVED__${preservedItems.length - 1}__`;
    });

  // Remove comments
  preservedText = preservedText.replace(singleLineCommentPattern, '');
  preservedText = preservedText.replace(multiLineCommentPattern, '');

  // Restore strings and regex patterns
  preservedText = preservedText.replace(/__PRESERVED__(\d+)__/g, (_, index) => preservedItems[Number(index)]);

  return preservedText;
}

/**
 * Recursively read all target files, excluding ignored files/directories and binary files.
 * Optionally removes whitespace and comments.
 * @param {string} dir - Current directory path.
 * @param {string} parentPath - Relative path from base directory.
 * @param {boolean} removeWhitespaceSetting - Flag to remove whitespace.
 * @param {boolean} removeCommentsSetting - Flag to remove comments.
 * @param {ignore.Ignore} ig - Configured ignore instance.
 * @returns {string} - Concatenated file contents.
 */
function readAllFiles(dir, parentPath = '', removeWhitespaceSetting = false, removeCommentsSetting = false, ig) {
  let allText = '';
  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const relativePath = path.relative(process.cwd(), fullPath);

    // Skip ignored files/directories
    if (ig.ignores(relativePath)) {
      return;
    }

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      allText += readAllFiles(fullPath, path.join(parentPath, item), removeWhitespaceSetting, removeCommentsSetting, ig);
    } else if (shouldProcessFile(item)) {
      // Skip binary files
      if (isBinaryFile(fullPath)) {
        console.warn(`Skipping binary file: ${relativePath}`);
        return;
      }

      let fileContent = fs.readFileSync(fullPath, 'utf8');

      if (removeWhitespaceSetting) {
        fileContent = removeWhitespace(fileContent);
      }

      if (removeCommentsSetting && path.extname(item).toLowerCase() === '.js') {
        fileContent = removeComments(fileContent);
      }

      allText += `File: ${item}\n`;
      allText += `Path: ${path.join(parentPath, item)}\n\n`;
      allText += fileContent + '\n\n';
    }
  });

  return allText;
}

/**
 * Format the file structure into a readable string with indentation.
 * @param {object} fileStructure - Directory structure object.
 * @param {number} indent - Current indentation level.
 * @returns {string} - Formatted directory structure.
 */
function formatStructure(fileStructure, indent = 0) {
  let structureText = '';
  const indentString = ' '.repeat(indent);

  for (const key in fileStructure) {
    if (fileStructure.hasOwnProperty(key)) {
      if (typeof fileStructure[key] === 'object' && 'relativePath' in fileStructure[key]) {
        const { relativePath, size, lastModified } = fileStructure[key];
        structureText += `${indentString}${key} (Path: ${relativePath}, Size: ${size} bytes, Last Modified: ${lastModified})\n`;
      } else {
        structureText += `${indentString}${key}/\n`;
        structureText += formatStructure(fileStructure[key], indent + 2);
      }
    }
  }

  return structureText;
}

// ====================
// Main Execution
// ====================

try {
  // Define the base directory as the current working directory
  const targetDir = process.cwd();

  // Define the output file path in the current working directory
  const outputFilePath = path.join(targetDir, 'output.txt');

  // Settings to remove whitespace and comments (set to true if needed)
  const removeWhitespaceSetting = false; // Set to true to remove whitespace
  const removeCommentsSetting = false; // Set to true to remove comments

  // Initialize ignore patterns
  const ig = getIgnorePatterns(targetDir);

  // Build the directory structure
  const fileStructure = getDirectoryStructure(targetDir, {}, '', ig);

  // Format the directory structure into a string
  const structureText = formatStructure(fileStructure);

  // Read and process all target files
  const filesText = readAllFiles(targetDir, '', removeWhitespaceSetting, removeCommentsSetting, ig);

  // Combine directory structure and file contents
  const finalOutput = `Directory Structure:\n${structureText}\nFile Contents:\n${filesText}`;

  // Write the final output to output.txt in the current working directory
  fs.writeFileSync(outputFilePath, finalOutput, 'utf8');

  console.log(`Folder structure and file contents have been saved to ${outputFilePath}`);
} catch (error) {
  console.error('Error processing directory:', error.message);
}
