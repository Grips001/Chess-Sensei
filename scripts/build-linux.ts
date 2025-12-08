/**
 * Linux Build Script for Chess-Sensei
 *
 * Builds a production-ready Linux x64 application with:
 * - Bun-compiled backend executable (with WebSocket IPC)
 * - Neutralino 6.4.0 UI runtime
 * - Stockfish 17.1 WASM engine
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { $ } from 'bun';

interface NeutralinoConfig {
  version: string;
  applicationId?: string;
  applicationName?: string;
  cli: {
    binaryName: string;
    distributionPath?: string;
  };
}

const projectRoot = process.cwd();

async function buildLinux(): Promise<void> {
  console.log('🔨 Linux Build for Chess-Sensei\n');

  // Read config
  let config: NeutralinoConfig;
  try {
    config = await fs.readJSON(path.join(projectRoot, 'neutralino.config.json'));
  } catch {
    console.error('❌ neutralino.config.json not found. Run from project root.');
    process.exit(1);
  }

  const appName = config.cli.binaryName;
  const distDir = path.join(projectRoot, config.cli.distributionPath ?? 'dist', appName);

  // Stockfish engine files to copy
  const stockfishSrcDir = path.join(projectRoot, 'node_modules', 'stockfish', 'src');
  const stockfishDestDir = path.join(distDir, 'stockfish');
  const STOCKFISH_JS = 'stockfish-17.1-lite-single-03e3232.js';
  const STOCKFISH_WASM = 'stockfish-17.1-lite-single-03e3232.wasm';

  // Step 0: Build frontend with Vite (compiles TS/CSS and copies public/ to app/)
  console.log('\n🏗️  Building frontend with Vite...');
  await $`bun run build`.cwd(projectRoot).quiet();
  console.log('  ✓ Vite build complete (frontend + assets)');

  // Step 1: Build Neutralino
  console.log('\n📦 Building Neutralino.js app...');
  await $`bunx @neutralinojs/neu build`.cwd(projectRoot).quiet();
  console.log('  ✓ Neutralino build complete');

  // Step 2: Build Bun executable for Linux x64
  console.log('\n📦 Building Bun executable for Linux x64...');
  const bunExePath = path.join(distDir, `${appName}-linux_x64`);

  await $`bun build src/backend/index.ts --compile --target=bun-linux-x64 --minify --outfile ${bunExePath}`
    .cwd(projectRoot)
    .quiet();
  console.log('  ✓ Bun executable built');

  // Step 3: Set permissions
  console.log('\n📁 Setting permissions...');
  await fs.chmod(bunExePath, 0o755);
  await fs.chmod(path.join(distDir, `${appName}-linux_x64`), 0o755);

  // Also make the Neutralino binary executable
  const neuBinPath = path.join(distDir, `${appName}-linux_x64`);
  if (await fs.pathExists(neuBinPath)) {
    await fs.chmod(neuBinPath, 0o755);
  }

  // Step 4: Copy Stockfish engine files
  // Bun's bundler cannot correctly bundle the stockfish.js IIFE module pattern,
  // so we distribute the files alongside the executable
  console.log('\n🎯 Copying Stockfish engine files...');
  await fs.ensureDir(stockfishDestDir);
  await Promise.all([
    fs.copy(path.join(stockfishSrcDir, STOCKFISH_JS), path.join(stockfishDestDir, STOCKFISH_JS)),
    fs.copy(
      path.join(stockfishSrcDir, STOCKFISH_WASM),
      path.join(stockfishDestDir, STOCKFISH_WASM)
    ),
  ]);
  console.log('  ✓ Stockfish engine files copied');

  console.log(`\n✅ Linux build complete! Output: ${distDir}`);
  console.log(`\nFiles created:`);
  const files = await fs.readdir(distDir);
  for (const file of files) {
    if (file.includes('linux')) {
      console.log(`  - ${file}`);
    }
  }
  // Also list resources.neu
  if (files.includes('resources.neu')) {
    console.log('  - resources.neu');
  }
  // List stockfish directory
  if (files.includes('stockfish')) {
    console.log('  - stockfish/');
    console.log(`      ${STOCKFISH_JS}`);
    console.log(`      ${STOCKFISH_WASM}`);
  }
}

// Run the build
buildLinux().catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
