/**
 * Backup & Restore IPC Handlers
 * Handles automatic backups, backup listing, and verification
 */

import { createDataStorage, type DataStorage } from '../data-storage';
import { logger } from '../file-logger';
// Note: ErrorResponse is available from ipc-types if needed for future error handling

export interface BackupHandlersDeps {
  getDataStorage: () => DataStorage | null;
  setDataStorage: (storage: DataStorage) => void;
}

export function createBackupHandlers(deps: BackupHandlersDeps) {
  const { getDataStorage, setDataStorage } = deps;

  async function ensureStorage(): Promise<DataStorage> {
    let storage = getDataStorage();
    if (!storage) {
      storage = createDataStorage();
      setDataStorage(storage);
      await storage.initialize();
    }
    return storage;
  }

  return {
    /**
     * Task 8.4.1: Get backup settings
     */
    getBackupSettings: async (): Promise<{
      settings: {
        enabled: boolean;
        frequency: string;
        lastBackupTimestamp?: string;
        compression: boolean;
      };
      success: true;
    }> => {
      const storage = await ensureStorage();
      const settings = await storage.loadBackupSettings();
      return { settings, success: true };
    },

    /**
     * Task 8.4.1: Save backup settings
     */
    saveBackupSettings: async (payload: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'after-game';
      compression: boolean;
    }): Promise<{ success: true }> => {
      const storage = await ensureStorage();
      const currentSettings = await storage.loadBackupSettings();
      await storage.saveBackupSettings({
        ...currentSettings,
        enabled: payload.enabled,
        frequency: payload.frequency,
        compression: payload.compression,
      });
      logger.info('Backup', 'Backup settings saved', payload);
      return { success: true };
    },

    /**
     * Task 8.4.1: Check if automatic backup should be created
     */
    checkBackupNeeded: async (payload: {
      trigger: 'startup' | 'after-game';
    }): Promise<{
      needed: boolean;
      success: true;
    }> => {
      const storage = await ensureStorage();
      const needed = await storage.shouldCreateBackup(payload.trigger);
      return { needed, success: true };
    },

    /**
     * Task 8.4.1: Create automatic backup
     */
    createAutomaticBackup: async (payload: {
      type: 'daily' | 'weekly' | 'after-game';
    }): Promise<{
      backup: {
        filename: string;
        timestamp: string;
        type: string;
        gameCount: number;
        size: number;
      } | null;
      success: true;
    }> => {
      const storage = await ensureStorage();
      logger.info('Backup', 'Creating automatic backup', { type: payload.type });
      const backup = await storage.createAutomaticBackup(payload.type);
      if (backup) {
        logger.info('Backup', 'Automatic backup created', backup);
      } else {
        logger.warn('Backup', 'Failed to create automatic backup');
      }
      return { backup, success: true };
    },

    /**
     * Task 8.4.3: List available backups
     */
    listBackups: async (): Promise<{
      backups: Array<{
        filename: string;
        timestamp: string;
        type: string;
        gameCount: number;
        size: number;
      }>;
      success: true;
    }> => {
      const storage = await ensureStorage();
      const backups = await storage.listBackups();
      return { backups, success: true };
    },

    /**
     * Task 8.4.4: Verify backup integrity
     */
    verifyBackup: async (payload: {
      filename: string;
    }): Promise<{
      valid: boolean;
      issues: string[];
      success: true;
    }> => {
      const storage = await ensureStorage();
      logger.info('Backup', 'Verifying backup', { filename: payload.filename });
      const result = await storage.verifyBackup(payload.filename);
      logger.info('Backup', 'Backup verification result', {
        ...result,
        filename: payload.filename,
      });
      return { ...result, success: true };
    },

    /**
     * Get backups folder path
     */
    getBackupsPath: async (): Promise<{ path: string; success: true }> => {
      const storage = await ensureStorage();
      return { path: storage.getBackupsPath(), success: true };
    },
  };
}

export type BackupHandlers = ReturnType<typeof createBackupHandlers>;
