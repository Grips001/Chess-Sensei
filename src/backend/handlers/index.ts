/**
 * Backend Handlers - Barrel Export
 * Re-exports all IPC handler modules
 */

// Types
export * from './ipc-types';

// Handler creators
export {
  createEngineHandlers,
  type EngineHandlers,
  type EngineHandlersDeps,
} from './engine-handlers';
export { createBotHandlers, type BotHandlers, type BotHandlersDeps } from './bot-handlers';
export {
  createAnalysisHandlers,
  type AnalysisHandlers,
  type AnalysisHandlersDeps,
} from './analysis-handlers';
export {
  createStorageHandlers,
  type StorageHandlers,
  type StorageHandlersDeps,
} from './storage-handlers';
export {
  createProgressHandlers,
  type ProgressHandlers,
  type ProgressHandlersDeps,
} from './progress-handlers';
export {
  createExportImportHandlers,
  type ExportImportHandlers,
  type ExportImportHandlersDeps,
} from './export-import-handlers';
export {
  createBackupHandlers,
  type BackupHandlers,
  type BackupHandlersDeps,
} from './backup-handlers';
export { createLoggingHandlers, type LoggingHandlers } from './logging-handlers';
