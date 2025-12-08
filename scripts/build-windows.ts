/**
 * Windows Build Script for Chess-Sensei
 *
 * Builds a production-ready Windows x64 application with:
 * - Bun-compiled backend executable (with WebSocket IPC)
 * - Neutralino 6.4.0 UI runtime
 * - Stockfish 17.1 WASM engine
 * - Custom icon and metadata via rcedit
 *
 * Note: rcedit is used for executable metadata because it correctly handles
 * Bun's PE section layout (pe-library does not support Bun executables).
 *
 * @see https://github.com/electron/rcedit
 */

import * as fs from 'fs-extra';
import * as nodefs from 'node:fs/promises';
import * as path from 'path';
import { $ } from 'bun';
import { createICO, HERMITE } from '@ctjs/png2icons';
import { rcedit } from 'rcedit';

interface NeutralinoConfig {
  version: string;
  applicationId?: string;
  applicationName?: string;
  applicationIcon?: string;
  author?: string;
  description?: string;
  copyright?: string;
  modes?: {
    window?: {
      title?: string;
      icon?: string;
    };
  };
  cli: {
    binaryName: string;
    distributionPath?: string;
  };
}

const projectRoot = process.cwd();

/**
 * Get the icon path from config
 */
function getIconPath(config: NeutralinoConfig): string {
  if (config.applicationIcon) {
    return path.join(projectRoot, config.applicationIcon.replace(/^\//, ''));
  }
  if (config.modes?.window?.icon) {
    return path.join(projectRoot, config.modes.window.icon.replace(/^\//, ''));
  }
  return path.join(projectRoot, 'public', 'icon.png');
}

/**
 * Convert PE subsystem to GUI mode (hides console window)
 *
 * Modifies the PE header subsystem field to IMAGE_SUBSYSTEM_WINDOWS_GUI (2)
 * so the application runs without showing a console window.
 *
 * Uses node:fs/promises for low-level file descriptor operations
 * to avoid TypeScript 5.6+ Buffer/ArrayBufferView type incompatibilities
 * with fs-extra's type definitions.
 */
async function makeWindowsBinGui(exePath: string): Promise<void> {
  const IMAGE_SUBSYSTEM_GUI = 2;
  const HEADER_OFFSET_LOCATION = 0x3c;
  const SUBSYSTEM_OFFSET = 0x5c;

  const fh = await nodefs.open(exePath, 'r+');
  try {
    const buffer = new Uint8Array(4);

    // Read PE header offset from 0x3C
    await fh.read(buffer, 0, 4, HEADER_OFFSET_LOCATION);
    const dataView = new DataView(buffer.buffer);
    const peHeaderOffset = dataView.getUint32(0, true); // little-endian

    // Seek to the subsystem field in the PE header
    const subsystemOffset = peHeaderOffset + SUBSYSTEM_OFFSET;
    const subsystemBuffer = new Uint8Array(2);
    const subsystemView = new DataView(subsystemBuffer.buffer);
    subsystemView.setUint16(0, IMAGE_SUBSYSTEM_GUI, true); // little-endian

    // Write the new subsystem value
    await fh.write(subsystemBuffer, 0, 2, subsystemOffset);
  } finally {
    await fh.close();
  }
}

/**
 * Patch Windows executable using rcedit
 */
async function patchWithRcedit(exePath: string, config: NeutralinoConfig): Promise<boolean> {
  const tempFolder = await fs.mkdtemp(path.join(projectRoot, 'temp-build-'));

  try {
    // Prepare rcedit options
    const productName = config.applicationName ?? config.cli.binaryName ?? 'Chess-Sensei';
    const fileVersion = config.version.split('-')[0] + '.0';
    const fileDescription = config.description ?? config.applicationName ?? 'Chess-Sensei';

    const rceditOptions: Parameters<typeof rcedit>[1] = {
      'file-version': fileVersion,
      'product-version': fileVersion,
      'version-string': {
        ProductName: productName,
        FileDescription: fileDescription,
        CompanyName: config.author ?? '',
        LegalCopyright: config.copyright ?? '',
        OriginalFilename: `${config.cli.binaryName}.exe`,
      },
    };

    // Convert PNG to ICO if icon exists
    const iconPath = getIconPath(config);
    if (await fs.pathExists(iconPath)) {
      const pngBuffer = await fs.readFile(iconPath);
      const ico = createICO(pngBuffer, HERMITE, 0, true, true);
      if (ico) {
        const icoPath = path.join(tempFolder, 'app.ico');
        // Convert Buffer to Uint8Array to satisfy TypeScript 5.6+ type requirements
        await fs.writeFile(icoPath, new Uint8Array(ico));
        rceditOptions.icon = icoPath;
      }
    }

    // Apply all patches with rcedit
    try {
      await rcedit(exePath, rceditOptions);
      console.log('  ✓ Icon and metadata set with rcedit');
      return true;
    } catch (e) {
      console.log('  ⚠ rcedit failed:', e instanceof Error ? e.message : e);
      return false;
    }
  } finally {
    await fs.remove(tempFolder);
  }
}

/**
 * Build Windows executables without resedit
 *
 * Output structure:
 *   build/Windows x64/
 *     Chess-Sensei/
 *       Chess-Sensei.exe     (main application - GUI mode)
 *       neutralino.exe       (UI runtime)
 *       resources.neu        (app resources)
 *
 * Note: All dependencies are in the same folder for simplicity
 */
async function buildWindows(): Promise<void> {
  console.log('🔨 Windows Build for Chess-Sensei\n');

  // Read config
  let config: NeutralinoConfig;
  try {
    config = await fs.readJSON(path.join(projectRoot, 'neutralino.config.json'));
  } catch {
    console.error('❌ neutralino.config.json not found. Run from project root.');
    process.exit(1);
  }

  const appName = config.cli.binaryName;
  const displayName = config.applicationName ?? 'Chess-Sensei';
  const buildsDir = path.join(projectRoot, 'build');
  const neuBuildsDir = path.join(projectRoot, config.cli.distributionPath ?? 'dist', appName);
  const bunBuildsDir = path.join(buildsDir, 'bun');
  // Structure: build/Windows x64/Chess-Sensei/
  const winOutputDir = path.join(buildsDir, 'Windows x64', displayName);

  // Stockfish engine files to copy
  const stockfishSrcDir = path.join(projectRoot, 'node_modules', 'stockfish', 'src');
  const stockfishDestDir = path.join(winOutputDir, 'stockfish');
  const STOCKFISH_JS = 'stockfish-17.1-lite-single-03e3232.js';
  const STOCKFISH_WASM = 'stockfish-17.1-lite-single-03e3232.wasm';

  // Clean previous builds
  if (await fs.pathExists(buildsDir)) {
    console.log('🧹 Cleaning previous builds...');
    await fs.remove(buildsDir);
  }

  // Step 1: Build frontend with Vite (compiles TS/CSS and copies public/ to app/)
  console.log('\n🏗️  Building frontend with Vite...');
  await $`bun run build`.cwd(projectRoot).quiet();
  console.log('  ✓ Vite build complete (frontend + assets)');

  // Step 2: Build Neutralino
  console.log('\n📦 Building Neutralino.js app...');
  await $`bunx @neutralinojs/neu build`.cwd(projectRoot).quiet();
  console.log('  ✓ Neutralino build complete');

  // Debug: List Neutralino build output
  console.log(`  → Looking for files in: ${neuBuildsDir}`);
  if (await fs.pathExists(neuBuildsDir)) {
    const neuFiles = await fs.readdir(neuBuildsDir);
    console.log(`  → Neutralino output files: ${neuFiles.join(', ')}`);
  } else {
    console.log(`  ⚠ Warning: Neutralino output directory not found: ${neuBuildsDir}`);
    // Try to find where neu build put the files
    const distDir = path.join(projectRoot, 'dist');
    if (await fs.pathExists(distDir)) {
      const distContents = await fs.readdir(distDir);
      console.log(`  → Contents of dist/: ${distContents.join(', ')}`);
    }
  }

  // Step 3: Build Bun executable for Windows
  console.log('\n📦 Building Bun executable for Windows...');
  await fs.ensureDir(bunBuildsDir);

  const bunExePath = path.join(bunBuildsDir, `${appName}-win_x64.exe`);

  // Note: We don't use --minify for Windows due to Bun bug causing silent crashes
  await $`bun build src/backend/index.ts --compile --target=bun-windows-x64 --outfile ${bunExePath}`
    .cwd(projectRoot)
    .quiet();
  console.log('  ✓ Bun executable built');

  // Step 4: Copy files to output directory
  console.log('\n📁 Organizing output files...');
  await fs.ensureDir(winOutputDir);

  // Organize files in a flat structure for simplicity
  const finalBunPath = path.join(winOutputDir, `${displayName}.exe`);
  const finalNeuPath = path.join(winOutputDir, 'neutralino.exe');
  const finalResPath = path.join(winOutputDir, 'resources.neu');
  const finalConfigPath = path.join(winOutputDir, 'neutralino.config.json');

  await Promise.all([
    fs.copy(bunExePath, finalBunPath),
    fs.copy(path.join(neuBuildsDir, `${appName}-win_x64.exe`), finalNeuPath),
    fs.copy(path.join(neuBuildsDir, 'resources.neu'), finalResPath),
    fs.copy(path.join(projectRoot, 'neutralino.config.json'), finalConfigPath),
  ]);
  console.log('  ✓ Files organized (including neutralino.config.json)');

  // Step 4b: Copy Stockfish engine files
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

  // Step 5: Try to patch with rcedit FIRST (before GUI conversion)
  // rcedit can sometimes reset subsystem, so we do GUI conversion after
  console.log('\n🎨 Patching executable metadata...');
  const rceditSuccess = await patchWithRcedit(finalBunPath, config);

  if (!rceditSuccess) {
    console.log('\n⚠️  Note: Executable built without custom icon/metadata.');
    console.log("   The executable will still work, but won't have a custom icon.");
    console.log('   Check the error message above for details.\n');
  }

  // Give Windows filesystem a moment
  console.log('\n⏳ Waiting for filesystem...');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 6: Convert to GUI mode (hide command prompt window) - do this AFTER rcedit
  console.log('\n🖥️  Converting to GUI mode...');
  await makeWindowsBinGui(finalBunPath);
  console.log('  ✓ Subsystem set to GUI');

  // Cleanup intermediate files
  await fs.remove(bunBuildsDir);
  await fs.remove(neuBuildsDir);

  console.log(`\n✅ Build complete! Output: ${path.dirname(winOutputDir)}`);
  console.log(`\nFolder structure:`);
  console.log(`  ${displayName}/`);
  console.log(`    ${displayName}.exe           (run with --dev for DevTools)`);
  console.log(`    neutralino.exe`);
  console.log(`    neutralino.config.json`);
  console.log(`    resources.neu`);
  console.log(`    stockfish/`);
  console.log(`      ${STOCKFISH_JS}`);
  console.log(`      ${STOCKFISH_WASM}`);
}

// Run the build
buildWindows().catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
