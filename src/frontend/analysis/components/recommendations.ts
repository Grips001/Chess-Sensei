/**
 * Training Recommendations Component
 * Generates personalized training recommendations based on game analysis
 */

import type { StoredAnalysisData, StoredGameData } from '../../../shared/analysis-types';

/**
 * Generate training recommendations based on analysis
 */
export function generateRecommendations(
  analysisData: StoredAnalysisData,
  gameData: StoredGameData
): string[] {
  const summary = analysisData.summary;
  const phases = analysisData.gamePhases;
  const recommendations: string[] = [];

  // Opening recommendations
  if (phases.opening.accuracy < 70) {
    recommendations.push('Study opening principles and develop a repertoire for common openings.');
  }

  // Tactical recommendations
  if (summary.blunders > 2 || summary.mistakes > 4) {
    recommendations.push(
      'Practice tactical puzzles to reduce blunders and improve pattern recognition.'
    );
  }

  // Time management recommendations
  const playerMoves = analysisData.moveAnalysis.filter(
    (m) => m.color === gameData.metadata.playerColor
  );
  const quickBlunders = playerMoves.filter(
    (m) => m.timeSpent < 3000 && (m.classification === 'blunder' || m.classification === 'mistake')
  );
  if (quickBlunders.length > 2) {
    recommendations.push('Slow down on critical moves - many errors came from quick decisions.');
  }

  // Middlegame recommendations
  if (phases.middlegame.accuracy < 70) {
    recommendations.push(
      'Focus on middlegame strategy: piece coordination, pawn structure, and king safety.'
    );
  }

  // Endgame recommendations
  if (phases.endgame.accuracy < 70 && phases.endgame.end > phases.endgame.start) {
    recommendations.push(
      'Study endgame fundamentals: king activity, pawn promotion, and basic checkmates.'
    );
  }

  // Tactical opportunities
  const missedTactics = analysisData.tacticalOpportunities.filter((t) => t.type === 'missed');
  if (missedTactics.length > 2) {
    recommendations.push(
      'Work on calculating tactics deeper - you missed several tactical opportunities.'
    );
  }

  // If no specific issues, give general encouragement
  if (recommendations.length === 0) {
    if (summary.overallAccuracy >= 85) {
      recommendations.push(
        'Excellent game! Continue with advanced positional concepts and deeper analysis.'
      );
    } else {
      recommendations.push(
        'Good game! Keep practicing regularly and analyze your games to improve.'
      );
    }
  }

  return recommendations;
}

/**
 * Render training recommendations
 */
export function renderTrainingRecommendations(
  analysisData: StoredAnalysisData | null,
  gameData: StoredGameData | null
): string {
  if (!analysisData || !gameData) return '';

  const recommendations = generateRecommendations(analysisData, gameData);

  return recommendations
    .map(
      (rec, i) => `
    <div class="recommendation-item">
      <span class="rec-number">${i + 1}</span>
      <span class="rec-text">${rec}</span>
    </div>
  `
    )
    .join('');
}
