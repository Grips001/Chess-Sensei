/**
 * Analysis UI Module - Barrel Export (Legacy)
 *
 * @deprecated This directory is deprecated. Use the new modular structure:
 * - Types: import from '../../shared/analysis-types'
 * - Components: import from '../analysis'
 * - Manager: import from '../analysis-ui' or '../analysis'
 *
 * This file exists for backward compatibility only.
 */

// Re-export all types from the shared location
export * from '../../shared/analysis-types';

// Re-export the main manager from the new analysis module
export { AnalysisUIManager, createAnalysisUI } from '../analysis';
