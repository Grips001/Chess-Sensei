/**
 * Chess-Sensei Backend Entry Point
 *
 * This file initializes the Bun backend and sets up IPC with the frontend.
 * Provides engine operations and game logic via WebSocket IPC (port 9339).
 */

let devMode = false;
{
  // Check for --dev flag to enable developer mode (console + inspector)
  devMode = process.argv.includes('--dev');
}

import { createWebSocketServer, WebSocketServer } from './websocket-server';
import { createEngine, StockfishEngine } from '../engine/stockfish-engine';
import { AIOpponent } from './ai-opponent';
import { type AnalysisPipeline } from './analysis-pipeline';
import { type MetricsCalculator } from './metrics-calculator';
import { type DataStorage } from './data-storage';
import { type ExportImportManager } from './export-import';
import { logger } from './file-logger';

// Import handler creators
import {
  createEngineHandlers,
  createBotHandlers,
  createAnalysisHandlers,
  createStorageHandlers,
  createProgressHandlers,
  createExportImportHandlers,
  createBackupHandlers,
  createLoggingHandlers,
  type PositionRequest,
  type AnalyzeMoveRequest,
  type BestMovesResponse,
  type EvaluationResponse,
  type MoveAnalysisResponse,
  type ErrorResponse,
} from './handlers';

// Initialize logger early (before other initialization)
const executablePath = process.execPath;
logger.initialize(devMode, executablePath).then(() => {
  if (devMode) {
    logger.info('Backend', 'Logger initialized', {
      devMode,
      executablePath,
      argv: process.argv,
      cwd: process.cwd(),
    });
  }
});

if (devMode) {
  console.log('Chess-Sensei Backend initialized (DEV MODE)');
  logger.info('Backend', 'Chess-Sensei Backend initialized (DEV MODE)');
} else {
  console.log('Chess-Sensei Backend initialized');
}

// ============================================
// Global State Management
// ============================================

// Global engine instance (persistent in memory per ai-engine.md)
let engine: StockfishEngine | null = null;

// Global AI opponent instance
let aiOpponent: AIOpponent | null = null;

// Global analysis pipeline instance
let analysisPipeline: AnalysisPipeline | null = null;

// Global metrics calculator instance
let metricsCalculator: MetricsCalculator | null = null;

// Global data storage instance
let dataStorage: DataStorage | null = null;

// Global export/import manager instance
let exportImportManager: ExportImportManager | null = null;

// Global WebSocket server instance for real-time streaming
let wsServer: WebSocketServer | null = null;

// ============================================
// Engine Initialization
// ============================================

/**
 * Initialize the chess engine
 * Called once on backend startup
 */
async function initializeEngine(): Promise<void> {
  if (engine) {
    console.log('Engine already initialized');
    return;
  }

  console.log('Initializing Stockfish engine...');
  engine = await createEngine();
  console.log('Stockfish engine ready');
}

// Initialize engine on startup
initializeEngine().catch((error) => {
  console.error('Failed to initialize engine:', error);
});

// ============================================
// State Accessors for Handlers
// ============================================

const stateAccessors = {
  getEngine: () => engine,
  initializeEngine,
  getAIOpponent: () => aiOpponent,
  setAIOpponent: (opponent: AIOpponent) => {
    aiOpponent = opponent;
  },
  getAnalysisPipeline: () => analysisPipeline,
  setAnalysisPipeline: (pipeline: AnalysisPipeline) => {
    analysisPipeline = pipeline;
  },
  getMetricsCalculator: () => metricsCalculator,
  setMetricsCalculator: (calculator: MetricsCalculator) => {
    metricsCalculator = calculator;
  },
  getDataStorage: () => dataStorage,
  setDataStorage: (storage: DataStorage) => {
    dataStorage = storage;
  },
  getExportImportManager: () => exportImportManager,
  setExportImportManager: (manager: ExportImportManager) => {
    exportImportManager = manager;
  },
};

// ============================================
// Create Handler Instances
// ============================================

const engineHandlers = createEngineHandlers(stateAccessors);
const botHandlers = createBotHandlers(stateAccessors);
const analysisHandlers = createAnalysisHandlers(stateAccessors);
const storageHandlers = createStorageHandlers(stateAccessors);
const progressHandlers = createProgressHandlers(stateAccessors);
const exportImportHandlers = createExportImportHandlers(stateAccessors);
const backupHandlers = createBackupHandlers(stateAccessors);
const loggingHandlers = createLoggingHandlers();

// ============================================
// Initialize WebSocket Server
// ============================================

wsServer = createWebSocketServer(9339, devMode);

// Register Core Engine Methods
wsServer.registerMethod('chess:sayHello', engineHandlers.sayHello);
wsServer.registerMethod('chess:startNewGame', engineHandlers.startNewGame);
wsServer.registerMethod('chess:requestBestMoves', engineHandlers.requestBestMoves);
wsServer.registerMethod('chess:evaluatePosition', engineHandlers.evaluatePosition);
wsServer.registerMethod('chess:analyzeMove', engineHandlers.analyzeMove);
wsServer.registerMethod('chess:getGuidanceMoves', engineHandlers.getGuidanceMoves);
wsServer.registerMethod('chess:setSkillLevel', engineHandlers.setSkillLevel);
wsServer.registerMethod('chess:getEngineStatus', engineHandlers.getEngineStatus);

// Register AI Opponent Methods
wsServer.registerMethod('chess:configureBot', botHandlers.configureBot);
wsServer.registerMethod('chess:getBotMove', botHandlers.getBotMove);
wsServer.registerMethod('chess:getBotProfiles', botHandlers.getBotProfiles);
wsServer.registerMethod('chess:getCurrentBotConfig', botHandlers.getCurrentBotConfig);
wsServer.registerMethod('chess:getDifficultyPresets', botHandlers.getDifficultyPresets);

// Register Analysis Pipeline Methods
wsServer.registerMethod('chess:analyzeGame', analysisHandlers.analyzeGame);
wsServer.registerMethod('chess:getAnalysisConfig', analysisHandlers.getAnalysisConfig);
wsServer.registerMethod('chess:calculateMetrics', analysisHandlers.calculateMetrics);

// Register Data Storage Methods
wsServer.registerMethod('chess:initializeStorage', storageHandlers.initializeStorage);
wsServer.registerMethod('chess:saveGame', storageHandlers.saveGame);
wsServer.registerMethod('chess:saveAnalysis', storageHandlers.saveAnalysis);
wsServer.registerMethod('chess:getGamesList', storageHandlers.getGamesList);
wsServer.registerMethod('chess:loadGame', storageHandlers.loadGame);
wsServer.registerMethod('chess:loadAnalysis', storageHandlers.loadAnalysis);
wsServer.registerMethod('chess:getStoragePath', storageHandlers.getStoragePath);

// Register Player Progress Methods
wsServer.registerMethod('chess:loadPlayerProfile', progressHandlers.loadPlayerProfile);
wsServer.registerMethod('chess:savePlayerProfile', progressHandlers.savePlayerProfile);
wsServer.registerMethod('chess:getAchievements', progressHandlers.getAchievements);
wsServer.registerMethod('chess:unlockAchievement', progressHandlers.unlockAchievement);

// Register Export/Import Methods
wsServer.registerMethod('chess:exportGame', exportImportHandlers.exportGame);
wsServer.registerMethod('chess:exportAllGames', exportImportHandlers.exportAllGames);
wsServer.registerMethod('chess:exportProfile', exportImportHandlers.exportProfile);
wsServer.registerMethod('chess:exportBackup', exportImportHandlers.exportBackup);
wsServer.registerMethod('chess:importGame', exportImportHandlers.importGame);
wsServer.registerMethod('chess:importBatchGames', exportImportHandlers.importBatchGames);
wsServer.registerMethod('chess:mergeProfiles', exportImportHandlers.mergeProfiles);
wsServer.registerMethod('chess:getExportsPath', exportImportHandlers.getExportsPath);

// Register Backup & Restore Methods
wsServer.registerMethod('chess:getBackupSettings', backupHandlers.getBackupSettings);
wsServer.registerMethod('chess:saveBackupSettings', backupHandlers.saveBackupSettings);
wsServer.registerMethod('chess:checkBackupNeeded', backupHandlers.checkBackupNeeded);
wsServer.registerMethod('chess:createAutomaticBackup', backupHandlers.createAutomaticBackup);
wsServer.registerMethod('chess:listBackups', backupHandlers.listBackups);
wsServer.registerMethod('chess:verifyBackup', backupHandlers.verifyBackup);
wsServer.registerMethod('chess:getBackupsPath', backupHandlers.getBackupsPath);

// Register Debug Logging Methods
wsServer.registerMethod('chess:logMessage', loggingHandlers.logMessage);
wsServer.registerMethod('chess:getLogPath', loggingHandlers.getLogPath);
wsServer.registerMethod('chess:isLoggingEnabled', loggingHandlers.isLoggingEnabled);

// ============================================
// Start WebSocket Server
// ============================================

await wsServer.start();
console.log(`[WebSocket] Server started on port ${wsServer.getPort()}`);

// Count total registered methods
const methodCount = 8 + 5 + 3 + 7 + 4 + 8 + 7 + 3; // engine + bot + analysis + storage + progress + export + backup + logging
console.log(`[WebSocket] Registered ${methodCount} RPC methods`);

// ============================================
// Launch Neutralino UI (Production Mode)
// ============================================

// Launch Neutralino UI after WebSocket server is ready
// Only launch in production mode (when running from built executable)
const isBuiltExecutable = process.execPath.includes('Chess-Sensei');
if (isBuiltExecutable) {
  const { spawn } = await import('child_process');
  const path = await import('path');

  // Get the directory containing the executable
  const exeDir = path.dirname(process.execPath);
  const neutralinoPath = path.join(exeDir, 'neutralino.exe');

  logger.info('Backend', 'Launching Neutralino UI', { path: neutralinoPath, devMode });

  // Build command line arguments for Neutralino
  const neutralinoArgs: string[] = [];
  if (devMode) {
    // Enable inspector (DevTools) in dev mode
    neutralinoArgs.push('--window-enable-inspector=true');
  }

  // Spawn Neutralino process
  const neutralinoProcess = spawn(neutralinoPath, neutralinoArgs, {
    cwd: exeDir,
    stdio: 'inherit',
    detached: false,
  });

  neutralinoProcess.on('error', (error) => {
    logger.error('Backend', 'Failed to launch Neutralino', error);
    console.error('[Neutralino] Failed to launch:', error.message);
  });

  neutralinoProcess.on('exit', (code) => {
    logger.info('Backend', 'Neutralino exited', { code });
    console.log(`[Neutralino] Process exited with code ${code}`);
    // Exit the backend when Neutralino closes
    process.exit(code ?? 0);
  });

  console.log('[Neutralino] UI launched');
} else {
  // Development mode - Neutralino is launched separately via `bun run dev`
  console.log('[Backend] Running in development mode - Neutralino should be launched separately');
}

// ============================================
// Exports
// ============================================

// Export types for frontend use
export type {
  PositionRequest,
  AnalyzeMoveRequest,
  BestMovesResponse,
  EvaluationResponse,
  MoveAnalysisResponse,
  ErrorResponse,
};

// Export WebSocket server instance for use in other modules
export { wsServer };

// Backend initialization complete
console.log('Chess-Sensei backend initialized successfully');
