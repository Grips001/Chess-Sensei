/**
 * macOS Build Script for Chess-Sensei
 *
 * Builds the application for macOS x64 and arm64 platforms.
 * Creates proper .app bundles for macOS distribution.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { $ } from 'bun';
import { createICNS, HERMITE } from '@ctjs/png2icons';

interface NeutralinoConfig {
  version: string;
  applicationId?: string;
  applicationName?: string;
  applicationIcon?: string;
  modes?: {
    window?: {
      icon?: string;
    };
  };
  cli: {
    binaryName: string;
    distributionPath?: string;
  };
}

const projectRoot = process.cwd();

function getIconPath(config: NeutralinoConfig): string {
  if (config.applicationIcon) {
    return path.join(projectRoot, config.applicationIcon.replace(/^\//, ''));
  }
  if (config.modes?.window?.icon) {
    return path.join(projectRoot, config.modes.window.icon.replace(/^\//, ''));
  }
  return path.join(projectRoot, 'public', 'icon.png');
}

async function createMacOSBundle(
  config: NeutralinoConfig,
  distDir: string,
  arch: 'x64' | 'arm64'
): Promise<void> {
  const appName = config.cli.binaryName;
  const archSuffix = arch === 'arm64' ? 'arm64' : 'x64';
  const bunTarget = arch === 'arm64' ? 'bun-darwin-arm64' : 'bun-darwin-x64';
  const neuPostfix = arch === 'arm64' ? 'mac_arm64' : 'mac_x64';

  console.log(`\n📦 Building for macOS ${archSuffix}...`);

  // Build Bun executable
  const bunExePath = path.join(distDir, `${appName}-${neuPostfix}-bun`);
  await $`bun build src/backend/index.ts --compile --target=${bunTarget} --minify --outfile ${bunExePath}`
    .cwd(projectRoot)
    .quiet();
  console.log(`  ✓ Bun executable built for ${archSuffix}`);

  // Create .app bundle structure in a separate directory
  const bundleDir = path.join(distDir, `${appName}-${neuPostfix}-bundle`);
  const appBundleName = `${config.applicationName || appName}.app`;
  const appBundlePath = path.join(bundleDir, appBundleName);
  const contentsPath = path.join(appBundlePath, 'Contents');
  const macOSPath = path.join(contentsPath, 'MacOS');
  const resourcesPath = path.join(contentsPath, 'Resources');

  await fs.ensureDir(macOSPath);
  await fs.ensureDir(resourcesPath);

  // Copy executables - neutralino binary is a file, not a directory
  const neuBinaryPath = path.join(distDir, `${appName}-${neuPostfix}`);
  await fs.copy(bunExePath, path.join(macOSPath, appName));
  await fs.copy(neuBinaryPath, path.join(macOSPath, 'neutralino'));
  await fs.copy(path.join(distDir, 'resources.neu'), path.join(macOSPath, 'resources.neu'));

  // Make executables... executable
  await fs.chmod(path.join(macOSPath, appName), 0o755);
  await fs.chmod(path.join(macOSPath, 'neutralino'), 0o755);

  // Create Info.plist
  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>${appName}</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>${config.applicationId || `com.chess-sensei.app`}</string>
    <key>CFBundleName</key>
    <string>${config.applicationName || appName}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>${config.version}</string>
    <key>CFBundleVersion</key>
    <string>${config.version}</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>`;

  await fs.writeFile(path.join(contentsPath, 'Info.plist'), infoPlist);

  // Create icon if available
  const iconPath = getIconPath(config);
  if (await fs.pathExists(iconPath)) {
    try {
      const pngBuffer = await fs.readFile(iconPath);
      const icns = createICNS(pngBuffer, HERMITE, 0);
      if (icns) {
        await fs.writeFile(path.join(resourcesPath, 'AppIcon.icns'), icns as unknown as Buffer);
        console.log(`  ✓ App icon created for ${archSuffix}`);
      }
    } catch (e) {
      console.log(`  ⚠ Could not create icon: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Clean up intermediate files
  await fs.remove(bunExePath);

  console.log(`  ✓ macOS ${archSuffix} bundle created`);
}

async function buildMacOS(): Promise<void> {
  console.log('🔨 macOS Build for Chess-Sensei\n');

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

  // Step 1: Build Neutralino
  console.log('📦 Building Neutralino.js app...');
  await $`bunx @neutralinojs/neu build`.cwd(projectRoot).quiet();
  console.log('  ✓ Neutralino build complete');

  // Step 2: Build for both architectures
  await createMacOSBundle(config, distDir, 'x64');
  await createMacOSBundle(config, distDir, 'arm64');

  console.log(`\n✅ macOS build complete! Output: ${distDir}`);
  console.log(`\nBundles created:`);
  const dirs = await fs.readdir(distDir);
  for (const dir of dirs) {
    if (dir.includes('mac_')) {
      console.log(`  - ${dir}/`);
    }
  }
}

// Run the build
buildMacOS().catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
