/**
 * Save and Analyze Module
 * Handles saving game data and running analysis
 */

import { ipc } from '../websocket-ipc-client';
import { IPC_METHODS, isErrorResponse } from '../../shared/ipc-types';
import type { ExamGameRecord } from '../exam-mode';
import { frontendLogger } from '../frontend-logger';

/**
 * Convert frontend ExamGameRecord to backend ExamGameData format
 * The backend expects a different structure for analysis
 */
export function convertToBackendFormat(record: ExamGameRecord): {
  gameId: string;
  timestamp: number;
  playerColor: 'white' | 'black';
  botPersonality: string;
  botElo: number;
  result: '1-0' | '0-1' | '1/2-1/2';
  termination: string;
  duration: number;
  moves: Array<{
    moveNumber: number;
    color: 'white' | 'black';
    san: string;
    uci: string;
    fen: string;
    timestamp: number;
    timeSpent: number;
  }>;
  pgn: string;
  startingFen?: string;
} {
  return {
    gameId: record.gameId,
    timestamp: new Date(record.timestamp).getTime(),
    playerColor: record.metadata.playerColor,
    botPersonality: record.metadata.botPersonality,
    botElo: record.metadata.botElo,
    result: record.metadata.result as '1-0' | '0-1' | '1/2-1/2',
    termination: record.metadata.termination,
    duration: record.metadata.duration,
    moves: record.moves.map((m) => ({
      moveNumber: m.moveNumber,
      color: m.color,
      san: m.san,
      uci: m.uci,
      fen: m.fen,
      timestamp: m.timestamp,
      timeSpent: m.timeSpent,
    })),
    pgn: record.pgn,
  };
}

/**
 * Save and analyze an Exam Mode game
 * Per Task 5.1: Analysis launch flow
 */
export async function saveAndAnalyzeGame(gameRecord: ExamGameRecord): Promise<boolean> {
  frontendLogger.separator('SaveAnalyze', 'Starting Game Save and Analysis');
  frontendLogger.info('SaveAnalyze', 'Starting save and analysis', {
    gameId: gameRecord.gameId,
    playerColor: gameRecord.metadata.playerColor,
    result: gameRecord.metadata.result,
    totalMoves: gameRecord.moves.length,
  });

  try {
    console.log('Starting game save and analysis for:', gameRecord.gameId);

    // Convert to backend format
    const gameData = convertToBackendFormat(gameRecord);
    frontendLogger.debug('SaveAnalyze', 'Converted to backend format', {
      gameId: gameData.gameId,
      moveCount: gameData.moves.length,
    });

    // Step 1: Analyze the game
    console.log('Analyzing game...');
    frontendLogger.info('SaveAnalyze', 'Step 1: Calling ANALYZE_GAME IPC');
    const analysisResponse = await ipc.call(IPC_METHODS.ANALYZE_GAME, {
      gameData,
      deepAnalysis: false, // Quick analysis for now
    });

    if (isErrorResponse(analysisResponse)) {
      frontendLogger.error('SaveAnalyze', 'Analysis failed', undefined, {
        error: analysisResponse.error,
        code: analysisResponse.code,
      });
      console.error('Analysis failed:', analysisResponse.error);
      return false;
    }

    const analysis = (analysisResponse as { analysis: unknown; success: true }).analysis;
    frontendLogger.info('SaveAnalyze', 'Analysis complete', {
      gameId: gameRecord.gameId,
    });
    console.log('Analysis complete');

    // Step 2: Save the game data
    console.log('Saving game data...');
    frontendLogger.info('SaveAnalyze', 'Step 2: Calling SAVE_GAME IPC');
    const saveGameResponse = await ipc.call(IPC_METHODS.SAVE_GAME, {
      gameData,
    });

    if (isErrorResponse(saveGameResponse)) {
      frontendLogger.error('SaveAnalyze', 'Save game failed', undefined, {
        error: saveGameResponse.error,
        code: saveGameResponse.code,
      });
      console.error('Save game failed:', saveGameResponse.error);
      return false;
    }
    const gamePath = (saveGameResponse as { path: string }).path;
    frontendLogger.info('SaveAnalyze', 'Game saved', { path: gamePath });
    console.log('Game saved to:', gamePath);

    // Step 3: Save the analysis
    console.log('Saving analysis...');
    frontendLogger.info('SaveAnalyze', 'Step 3: Calling SAVE_ANALYSIS IPC');
    const saveAnalysisResponse = await ipc.call(IPC_METHODS.SAVE_ANALYSIS, {
      analysis,
    });

    if (isErrorResponse(saveAnalysisResponse)) {
      frontendLogger.error('SaveAnalyze', 'Save analysis failed', undefined, {
        error: saveAnalysisResponse.error,
        code: saveAnalysisResponse.code,
      });
      console.error('Save analysis failed:', saveAnalysisResponse.error);
      return false;
    }
    const analysisPath = (saveAnalysisResponse as { path: string }).path;
    frontendLogger.info('SaveAnalyze', 'Analysis saved', { path: analysisPath });
    console.log('Analysis saved to:', analysisPath);

    frontendLogger.info('SaveAnalyze', 'Game save and analysis complete', {
      gameId: gameRecord.gameId,
      gamePath,
      analysisPath,
    });
    console.log('Game save and analysis complete');
    return true;
  } catch (error) {
    frontendLogger.error('SaveAnalyze', 'Error in saveAndAnalyzeGame', error as Error);
    console.error('Error in saveAndAnalyzeGame:', error);
    return false;
  }
}
