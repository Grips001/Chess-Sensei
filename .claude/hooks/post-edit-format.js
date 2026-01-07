#!/usr/bin/env node
/* eslint-disable no-undef */
/**
 * PostToolUse Hook: Auto-format edited files
 *
 * Runs Prettier on TypeScript/JavaScript files after they're edited
 * to ensure consistent formatting without manual intervention.
 *
 * Only formats files that Prettier supports.
 */

const { execSync } = require('child_process');
const path = require('path');

// Read input from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path;

    if (!filePath) {
      process.exit(0);
    }

    // File extensions that Prettier should format
    const formattableExtensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.mjs',
      '.mts',
      '.json',
      '.css',
      '.md',
    ];

    const ext = path.extname(filePath).toLowerCase();

    if (!formattableExtensions.includes(ext)) {
      process.exit(0);
    }

    // Skip node_modules and build directories
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (
      normalizedPath.includes('node_modules/') ||
      normalizedPath.includes('build/') ||
      normalizedPath.includes('dist/')
    ) {
      process.exit(0);
    }

    // Run Prettier on the file with explicit config path
    // Using the prettier binary from node_modules since we already have it installed
    try {
      const prettierCmd = process.platform === 'win32'
        ? './node_modules/.bin/prettier.exe'
        : './node_modules/.bin/prettier';

      execSync(
        `"${prettierCmd}" --config .config/.prettierrc.json --ignore-path .config/.prettierignore --write "${filePath}"`,
        {
          encoding: 'utf8',
          timeout: 10000,
          stdio: 'pipe',
          shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
        }
      );
    } catch {
      // Prettier failed - don't block, just continue
      // The lint step will catch any issues
    }

    process.exit(0);
  } catch {
    // On error, allow operation to continue
    process.exit(0);
  }
});
