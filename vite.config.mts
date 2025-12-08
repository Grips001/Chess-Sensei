import { defineConfig, PluginOption } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { ChildProcess, spawn } from 'node:child_process';

const bunIndex = './src/backend/index.ts';
const neuConfig = JSON.parse(fs.readFileSync('neutralino.config.json', 'utf8'));
const neuResourcesRoot = '.' + neuConfig.cli.resourcesPath;

let launchedDevServer = false;
let bunProcess: ChildProcess | null = null;
let neuProcess: ChildProcess | null = null;

/**
 * Vite plugin for Chess-Sensei development
 *
 * Handles:
 * - Icon copying during build
 * - Starting Bun backend (WebSocket server on port 9339)
 * - Starting Neutralino UI shell
 *
 * @see source-docs/architecture.md - "WebSocket IPC Architecture"
 */
const chessenseiDev = (): PluginOption => [
  {
    name: 'vite-plugin-chessensei:copy-icon',
    enforce: 'post',
    async buildStart() {
      // Copy the app icon when developing an app
      await fs.promises.mkdir('./app', {
        recursive: true,
      });
      await fs.promises.copyFile('public/icon.png', path.join(neuResourcesRoot + '/icon.png'));
    },
  },
  {
    name: 'vite-plugin-chessensei:serve',
    apply: 'serve',
    enforce: 'post',
    async configureServer(server) {
      // Start dev servers when Vite is ready
      server.httpServer?.once('listening', async () => {
        if (launchedDevServer) {
          return;
        }
        const address = server.httpServer?.address();
        if (!address || typeof address === 'string') {
          throw new Error('Failed to get server address');
        }
        const protocol = server.config.server.https ? 'https' : 'http',
          host = '127.0.0.1',
          port = address.port;
        const viteUrl = `${protocol}://${host}:${port}`;

        console.log(`\n🚀 Starting Chess-Sensei development servers...`);
        console.log(`   Frontend: ${viteUrl}`);
        console.log(`   Backend WebSocket: ws://localhost:9339`);

        // Start Bun backend (WebSocket server)
        bunProcess = spawn('bun', ['run', bunIndex, '--dev'], {
          stdio: 'inherit',
          shell: true,
        });

        // Wait for backend to start
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Start Neutralino with Vite URL
        neuProcess = spawn('bunx', ['@neutralinojs/neu', 'run', '--', `--url=${viteUrl}`], {
          stdio: 'inherit',
          shell: true,
        });

        launchedDevServer = true;

        // Handle cleanup on exit
        const cleanup = () => {
          if (bunProcess) bunProcess.kill();
          if (neuProcess) neuProcess.kill();
        };
        process.on('exit', cleanup);
        process.on('SIGINT', () => {
          cleanup();
          process.exit(0);
        });
        process.on('SIGTERM', () => {
          cleanup();
          process.exit(0);
        });
      });
    },
  },
  {
    name: 'vite-plugin-chessensei:build',
    apply: 'build',
    enforce: 'post',
    async closeBundle() {
      // Production build - just build frontend assets
      // Platform-specific builds (build:windows, build:linux, build:macos)
      // handle Bun compilation and Neutralino packaging separately
      console.log('✓ Frontend assets built to', neuResourcesRoot);
    },
  },
];

// https://vite.dev/config/
export default defineConfig({
  plugins: [chessenseiDev()],
  server: {
    host: '127.0.0.1',
    open: false,
  },
  build: {
    outDir: neuResourcesRoot,
  },
});
