#!/usr/bin/env node
/* eslint-disable no-undef */
/**
 * SessionStart Hook: Inject project context
 *
 * Provides useful context at the start of each Claude Code session,
 * including current branch, recent commits, and project status.
 *
 * Output is added to the conversation context.
 */

const { execSync } = require('child_process');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim();
  } catch {
    return null;
  }
}

// Gather project context
const branch = run('git rev-parse --abbrev-ref HEAD');
const lastCommit = run('git log -1 --format="%h %s"');
const status = run('git status --porcelain');
const hasChanges = status && status.length > 0;

// Build context message
const context = [];

context.push('## Session Context');
context.push('');

if (branch) {
  context.push(`**Current Branch:** \`${branch}\``);
}

if (lastCommit) {
  context.push(`**Last Commit:** ${lastCommit}`);
}

if (hasChanges) {
  const changedFiles = status.split('\n').length;
  context.push(`**Uncommitted Changes:** ${changedFiles} file(s)`);
}

context.push('');
context.push(
  'Remember: This is a **stable v1.0 release**. Prioritize stability over new features.'
);

// Output context (will be added to conversation)
console.log(context.join('\n'));
