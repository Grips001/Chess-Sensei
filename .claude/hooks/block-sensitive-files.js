#!/usr/bin/env bun

/**
 * PreToolUse Hook: Block edits to sensitive files
 *
 * Prevents accidental edits to files that should only be modified
 * through explicit user request or specific workflows.
 *
 * Exit codes:
 *   0 - Allow the operation
 *   2 - Block the operation (stderr shown to Claude)
 */

// Read input from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path || '';

    // Files that require explicit user request to modify
    const blockedPatterns = [
      '.env',
      '.env.local',
      '.env.production',
      'package-lock.json',
      'bun.lockb',
      '.git/',
      'node_modules/',
      'build/',
      'dist/',
    ];

    // Files that should warn but not block
    const warnPatterns = ['CHANGELOG.md', 'ATTRIBUTIONS.md', 'LICENSE'];

    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();

    // Check for blocked patterns
    for (const pattern of blockedPatterns) {
      if (normalizedPath.includes(pattern.toLowerCase())) {
        console.error(
          `Blocked: ${filePath} matches protected pattern "${pattern}". ` +
            `This file should not be modified directly.`
        );
        process.exit(2);
      }
    }

    // Check for warn patterns (allow but notify)
    for (const pattern of warnPatterns) {
      if (normalizedPath.endsWith(pattern.toLowerCase())) {
        // Output JSON to add a system message but allow
        console.log(
          JSON.stringify({
            decision: 'allow',
            reason: `Modifying ${pattern} - ensure this follows project workflow`,
          })
        );
        process.exit(0);
      }
    }

    // Allow all other files
    process.exit(0);
  } catch {
    // On parse error, allow the operation (fail open)
    process.exit(0);
  }
});
