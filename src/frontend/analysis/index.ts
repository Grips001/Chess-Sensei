/**
 * Analysis Module - Barrel Export
 *
 * Re-exports all analysis components and the controller for backward compatibility.
 */

// Re-export all types from shared analysis types
export * from '../../shared/analysis-types';

// Re-export the main controller
export { AnalysisUIManager, createAnalysisUI } from './analysis-controller';
export { default } from './analysis-controller';

// Re-export individual components for direct use
export * from './components';
