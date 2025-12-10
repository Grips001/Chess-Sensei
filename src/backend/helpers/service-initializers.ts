/**
 * Service Initializers
 *
 * Centralizes lazy initialization of backend services.
 * Reduces code duplication across 40+ initialization checks.
 */

import { createEngine, StockfishEngine } from '../../engine/stockfish-engine';
import { createAnalysisPipeline, AnalysisPipeline } from '../analysis-pipeline';
import { createMetricsCalculator, MetricsCalculator } from '../metrics-calculator';
import { createDataStorage, DataStorage } from '../data-storage';
import { createExportImportManager, ExportImportManager } from '../export-import';

/**
 * Service container holding singleton instances.
 * Services are lazily initialized on first use.
 *
 * Note: AIOpponent is NOT included here because it requires configuration
 * from the configureBot handler and cannot be lazily initialized.
 */
interface ServiceContainer {
  engine: StockfishEngine | null;
  analysisPipeline: AnalysisPipeline | null;
  metricsCalculator: MetricsCalculator | null;
  dataStorage: DataStorage | null;
  exportImportManager: ExportImportManager | null;
}

/**
 * Global service container - holds all singleton service instances
 */
export const services: ServiceContainer = {
  engine: null,
  analysisPipeline: null,
  metricsCalculator: null,
  dataStorage: null,
  exportImportManager: null,
};

/**
 * Ensures the Stockfish engine is initialized and returns it.
 *
 * @returns Initialized StockfishEngine instance
 * @throws Error if engine initialization fails
 *
 * @example
 * ```typescript
 * const engine = await ensureEngine();
 * await engine.setPosition(fen);
 * ```
 */
export async function ensureEngine(): Promise<StockfishEngine> {
  if (!services.engine) {
    console.log('Initializing Stockfish engine...');
    services.engine = await createEngine();
    console.log('Stockfish engine ready');
  }
  return services.engine;
}

/**
 * Ensures the Analysis Pipeline is initialized and returns it.
 *
 * @returns Initialized AnalysisPipeline instance
 * @throws Error if initialization fails
 */
export async function ensureAnalysisPipeline(): Promise<AnalysisPipeline> {
  if (!services.analysisPipeline) {
    const engine = await ensureEngine();
    services.analysisPipeline = createAnalysisPipeline(engine);
  }
  return services.analysisPipeline;
}

/**
 * Ensures the Metrics Calculator is initialized and returns it.
 *
 * @returns Initialized MetricsCalculator instance
 */
export function ensureMetricsCalculator(): MetricsCalculator {
  if (!services.metricsCalculator) {
    services.metricsCalculator = createMetricsCalculator();
  }
  return services.metricsCalculator;
}

/**
 * Ensures the Data Storage is initialized and returns it.
 * Also calls initialize() to ensure directories exist.
 *
 * @returns Initialized DataStorage instance
 * @throws Error if initialization fails
 */
export async function ensureDataStorage(): Promise<DataStorage> {
  if (!services.dataStorage) {
    services.dataStorage = createDataStorage();
  }
  await services.dataStorage.initialize();
  return services.dataStorage;
}

/**
 * Ensures the Export/Import Manager is initialized and returns it.
 *
 * @returns Initialized ExportImportManager instance
 * @throws Error if initialization fails
 */
export async function ensureExportImportManager(): Promise<ExportImportManager> {
  if (!services.exportImportManager) {
    const dataStorage = await ensureDataStorage();
    // ExportImportManager takes the storage base path, not the DataStorage instance
    services.exportImportManager = createExportImportManager(dataStorage.getStorageBasePath());
  }
  return services.exportImportManager;
}

/**
 * Checks if the engine is currently initialized.
 *
 * @returns true if engine is initialized and ready
 */
export function isEngineInitialized(): boolean {
  return services.engine?.isInitialized() ?? false;
}

/**
 * Resets all services (useful for testing or cleanup).
 */
export function resetAllServices(): void {
  services.engine = null;
  services.analysisPipeline = null;
  services.metricsCalculator = null;
  services.dataStorage = null;
  services.exportImportManager = null;
}
