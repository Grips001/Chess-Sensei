/**
 * Evaluation Graph Component
 * Renders the evaluation graph showing game flow
 */

import type { StoredAnalysisData, StoredGameData } from '../../../shared/analysis-types';
import { MOVE_COLORS } from '../../../shared/analysis-types';

/**
 * Render the evaluation graph
 */
export function renderEvaluationGraph(
  analysisData: StoredAnalysisData | null,
  gameData: StoredGameData | null
): string {
  if (!analysisData || analysisData.moveAnalysis.length === 0) {
    return '<div class="no-data">No evaluation data</div>';
  }

  const moves = analysisData.moveAnalysis;
  const totalMoves = moves.length;
  const playerColor = gameData?.metadata.playerColor || 'white';

  // Calculate graph dimensions
  const width = 100;
  const height = 100;
  const padding = 5;

  // Normalize evaluations to graph coordinates
  const maxEval = 500; // Cap at ±5 pawns for visualization
  const normalizeEval = (eval_: number) => {
    const capped = Math.max(-maxEval, Math.min(maxEval, eval_));
    const normalized = (capped + maxEval) / (2 * maxEval);
    return height - padding - normalized * (height - 2 * padding);
  };

  // Build path
  const points: string[] = [];
  const dots: string[] = [];

  moves.forEach((move, i) => {
    const x = padding + (i / Math.max(totalMoves - 1, 1)) * (width - 2 * padding);
    const y = normalizeEval(move.evaluationAfter);
    points.push(`${x},${y}`);

    // Only add dots for player moves with mistakes/blunders
    if (
      move.color === playerColor &&
      (move.classification === 'mistake' || move.classification === 'blunder')
    ) {
      const color = MOVE_COLORS[move.classification];
      dots.push(`
        <circle
          class="eval-point"
          cx="${x}"
          cy="${y}"
          r="3"
          fill="${color}"
          data-index="${i}"
          style="cursor: pointer"
        />
      `);
    }
  });

  // Calculate midpoint for reference line
  const midY = normalizeEval(0);

  return `
    <div class="eval-graph-container">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="eval-graph">
        <!-- Background gradient areas -->
        <defs>
          <linearGradient id="whiteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color: rgba(255,255,255,0.3)" />
            <stop offset="100%" style="stop-color: rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id="blackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color: rgba(0,0,0,0)" />
            <stop offset="100%" style="stop-color: rgba(0,0,0,0.3)" />
          </linearGradient>
        </defs>

        <!-- White advantage area -->
        <rect x="${padding}" y="${padding}" width="${width - 2 * padding}" height="${midY - padding}" fill="url(#whiteGrad)" />

        <!-- Black advantage area -->
        <rect x="${padding}" y="${midY}" width="${width - 2 * padding}" height="${height - midY - padding}" fill="url(#blackGrad)" />

        <!-- Center line (eval = 0) -->
        <line x1="${padding}" y1="${midY}" x2="${width - padding}" y2="${midY}" stroke="#999" stroke-width="0.5" stroke-dasharray="2,2" />

        <!-- Evaluation line -->
        <polyline
          points="${points.join(' ')}"
          fill="none"
          stroke="#4682b4"
          stroke-width="1.5"
        />

        <!-- Error markers -->
        ${dots.join('')}

        <!-- Current position marker -->
        <line
          id="eval-current-marker"
          x1="0" y1="${padding}" x2="0" y2="${height - padding}"
          stroke="#ff6b6b"
          stroke-width="1"
          opacity="0.7"
        />
      </svg>
      <div class="eval-labels">
        <span class="label-white">White</span>
        <span class="label-black">Black</span>
      </div>
    </div>
  `;
}

/**
 * Update eval graph current position marker
 */
export function updateEvalGraphMarker(
  analysisData: StoredAnalysisData | null,
  index: number
): void {
  if (!analysisData) return;
  const marker = document.getElementById('eval-current-marker');
  if (!marker) return;

  const totalMoves = analysisData.moveAnalysis.length;
  const x = (index / Math.max(totalMoves - 1, 1)) * 100;
  marker.setAttribute('x1', `${x}%`);
  marker.setAttribute('x2', `${x}%`);
}
