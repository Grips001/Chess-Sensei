/**
 * Custom Windows Build Script for Chess-Sensei
 *
 * This script works around the pe-library/resedit incompatibility with
 * Bun-compiled executables by using rcedit (from Electron) instead.
 *
 * The issue: pe-library throws "After Resource section, sections except for
 * relocation are not supported" when trying to patch Bun executables because
 * Bun's PE section layout differs from what pe-library expects.
 *
 * Solution: Use rcedit which handles Bun executables correctly.
 *
 * @see https://github.com/electron/rcedit
 */

import * as fs from 'fs-extra';
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
 * Convert subsystem to GUI (hide console window)
 * This is the same as makeWindowsBinGui in buntralino-cli
 */
async function makeWindowsBinGui(exePath: string): Promise<void> {
  const IMAGE_SUBSYSTEM_GUI = 2;
  const HEADER_OFFSET_LOCATION = 0x3c;
  const SUBSYSTEM_OFFSET = 0x5c;

  const fd = await fs.open(exePath, 'r+');
  const buffer = Buffer.alloc(4);

  // Read PE header offset from 0x3C
  await fs.read(fd, buffer, 0, 4, HEADER_OFFSET_LOCATION);
  const peHeaderOffset = buffer.readUInt32LE(0);

  // Seek to the subsystem field in the PE header
  const subsystemOffset = peHeaderOffset + SUBSYSTEM_OFFSET;
  const subsystemBuffer = Buffer.alloc(2);
  subsystemBuffer.writeUInt16LE(IMAGE_SUBSYSTEM_GUI, 0);

  // Write the new subsystem value
  await fs.write(fd, subsystemBuffer, 0, 2, subsystemOffset);
  await fs.close(fd);
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
        await fs.writeFile(icoPath, ico as unknown as Buffer);
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
 */
async function buildWindows(): Promise<void> {
  console.log('🔨 Custom Windows Build for Chess-Sensei\n');

  // Read config
  let config: NeutralinoConfig;
  try {
    config = await fs.readJSON(path.join(projectRoot, 'neutralino.config.json'));
  } catch {
    console.error('❌ neutralino.config.json not found. Run from project root.');
    process.exit(1);
  }

  const appName = config.cli.binaryName;
  const buildsDir = path.join(projectRoot, 'build');
  const neuBuildsDir = path.join(projectRoot, config.cli.distributionPath ?? 'dist', appName);
  const bunBuildsDir = path.join(buildsDir, 'bun');
  const winOutputDir = path.join(buildsDir, 'Windows x64');

  // Clean previous builds
  if (await fs.pathExists(buildsDir)) {
    console.log('🧹 Cleaning previous builds...');
    await fs.remove(buildsDir);
  }

  // Step 1: Build Neutralino
  console.log('\n📦 Building Neutralino.js app...');
  await $`bunx @neutralinojs/neu build`.cwd(projectRoot).quiet();
  console.log('  ✓ Neutralino build complete');

  // Debug: List what Neutralino created
  console.log(`  📂 Checking ${neuBuildsDir}...`);
  if (await fs.pathExists(neuBuildsDir)) {
    const files = await fs.readdir(neuBuildsDir);
    console.log(`  📂 Contents: ${files.join(', ')}`);
  } else {
    console.log(`  ⚠ Directory doesn't exist: ${neuBuildsDir}`);
    // Try to find where Neutralino actually put things
    const distPath = path.join(projectRoot, 'dist');
    if (await fs.pathExists(distPath)) {
      const distContents = await fs.readdir(distPath);
      console.log(`  📂 dist/ contains: ${distContents.join(', ')}`);
    }
  }

  // Step 2: Build Bun executable for Windows
  console.log('\n📦 Building Bun executable for Windows...');
  await fs.ensureDir(bunBuildsDir);

  const bunExePath = path.join(bunBuildsDir, `${appName}-win_x64.exe`);

  // Note: We don't use --minify for Windows due to Bun bug causing silent crashes
  await $`bun build src/backend/index.ts --compile --target=bun-windows-x64 --outfile ${bunExePath}`
    .cwd(projectRoot)
    .quiet();
  console.log('  ✓ Bun executable built');

  // Step 3: Copy files to output directory
  console.log('\n📁 Organizing output files...');
  await fs.ensureDir(winOutputDir);

  const finalBunPath = path.join(winOutputDir, `${appName}.exe`);
  const finalNeuPath = path.join(winOutputDir, 'neutralino.exe');
  const finalResPath = path.join(winOutputDir, 'resources.neu');

  await Promise.all([
    fs.copy(bunExePath, finalBunPath),
    fs.copy(path.join(neuBuildsDir, `${appName}-win_x64.exe`), finalNeuPath),
    fs.copy(path.join(neuBuildsDir, 'resources.neu'), finalResPath),
  ]);
  console.log('  ✓ Files organized');

  // Step 4: Convert to GUI mode (hide console)
  console.log('\n🖥️  Converting to GUI mode...');
  await makeWindowsBinGui(finalBunPath);
  console.log('  ✓ Subsystem set to GUI');

  // Give Windows filesystem a moment
  console.log('\n⏳ Waiting for filesystem...');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Step 5: Try to patch with rcedit
  console.log('\n🎨 Patching executable metadata...');
  const rceditSuccess = await patchWithRcedit(finalBunPath, config);

  if (!rceditSuccess) {
    console.log('\n⚠️  Note: Executable built without custom icon/metadata.');
    console.log("   The executable will still work, but won't have a custom icon.");
    console.log('   Check the error message above for details.\n');
  }

  // Cleanup intermediate files
  await fs.remove(bunBuildsDir);
  await fs.remove(neuBuildsDir);

  console.log(`\n✅ Build complete! Output: ${winOutputDir}`);
  console.log(`\nFiles created:`);
  console.log(`  - ${appName}.exe (main application)`);
  console.log(`  - neutralino.exe (UI runtime)`);
  console.log(`  - resources.neu (app resources)`);
}

// Run the build
buildWindows().catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
