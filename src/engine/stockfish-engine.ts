/**
 * Stockfish Engine Implementation
 *
 * Implements the Engine interface using the Stockfish WASM engine.
 * Provides a clean abstraction over UCI protocol communication.
 *
 * @see src/shared/engine-types.ts for interface definitions
 * @see source-docs/ai-engine.md for specification
 */

import {
  type Engine,
  type BestMove,
  type GetBestMovesOptions,
  type EngineOptions,
  type PositionEvaluation,
  type MoveAnalysis,
  STARTPOS_FEN,
  classifyMove,
  formatScore,
} from '../shared/engine-types';
import { loadStockfish, type StockfishInstance } from './stockfish-loader';

/**
 * Parse UCI info line into evaluation data
 */
function parseInfoLine(line: string): Partial<PositionEvaluation & { multipv: number }> | null {
  if (!line.startsWith('info ')) {
    return null;
  }

  const result: Partial<PositionEvaluation & { multipv: number }> = {};
  const tokens = line.split(' ');

  for (let i = 1; i < tokens.length; i++) {
    switch (tokens[i]) {
      case 'depth':
        result.depth = parseInt(tokens[++i], 10);
        break;
      case 'multipv':
        result.multipv = parseInt(tokens[++i], 10);
        break;
      case 'score':
        if (tokens[i + 1] === 'cp') {
          result.score = parseInt(tokens[i + 2], 10);
          i += 2;
        } else if (tokens[i + 1] === 'mate') {
          // Convert mate score to centipawns (large value)
          const mateIn = parseInt(tokens[i + 2], 10);
          result.score = mateIn > 0 ? 100000 - mateIn : -100000 - mateIn;
          i += 2;
        }
        break;
      case 'nodes':
        result.nodes = parseInt(tokens[++i], 10);
        break;
      case 'nps':
        result.nps = parseInt(tokens[++i], 10);
        break;
      case 'time':
        result.time = parseInt(tokens[++i], 10);
        break;
      case 'pv':
        result.pv = tokens.slice(i + 1);
        if (result.pv.length > 0) {
          result.bestMove = result.pv[0];
        }
        i = tokens.length; // End of line
        break;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Parse bestmove line
 */
function _parseBestMove(line: string): string | null {
  if (!line.startsWith('bestmove ')) {
    return null;
  }
  const tokens = line.split(' ');
  return tokens[1] || null;
}

/**
 * Stockfish Engine implementation
 */
export class StockfishEngine implements Engine {
  private engine: StockfishInstance | null = null;
  private initialized = false;
  private currentFen: string = STARTPOS_FEN;
  private options: EngineOptions = {};
  private outputBuffer: string[] = [];
  private resolveCallback: ((value: unknown) => void) | null = null;

  /**
   * Create a new Stockfish engine instance
   * @param options - Engine configuration options
   */
  constructor(options?: EngineOptions) {
    if (options) {
      this.options = options;
    }
  }

  /**
   * Initialize the engine
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Load the Stockfish WASM module
    this.engine = await loadStockfish();

    // Set up output listener
    this.engine.setListener((line) => {
      this.handleOutput(line);
    });

    // Initialize UCI
    await this.sendCommand('uci', 'uciok');

    // Apply engine options
    await this.applyOptions();

    // Wait for ready
    await this.sendCommand('isready', 'readyok');

    this.initialized = true;
  }

  /**
   * Set the current position
   */
  async setPosition(fen: string, moves?: string[]): Promise<void> {
    this.ensureInitialized();

    this.currentFen = fen;

    let positionCmd = `position fen ${fen}`;
    if (moves && moves.length > 0) {
      positionCmd += ` moves ${moves.join(' ')}`;
    }

    this.engine!.postMessage(positionCmd);

    // Position command doesn't produce output, just wait briefly
    await this.sendCommand('isready', 'readyok');
  }

  /**
   * Get best move recommendations
   */
  async getBestMoves(options?: GetBestMovesOptions): Promise<BestMove[]> {
    this.ensureInitialized();

    const count = options?.count ?? 1;

    // Set MultiPV if requesting multiple moves
    if (count > 1) {
      await this.sendCommand(`setoption name MultiPV value ${count}`);
      await this.sendCommand('isready', 'readyok');
    }

    // Build go command
    let goCmd = 'go';
    if (options?.depth !== undefined) {
      goCmd += ` depth ${options.depth}`;
    }
    if (options?.movetime !== undefined) {
      goCmd += ` movetime ${options.movetime}`;
    }

    // Clear buffer and send search command
    this.outputBuffer = [];
    await this.sendCommand(goCmd, 'bestmove');

    // Parse results
    const results: Map<number, BestMove> = new Map();

    for (const line of this.outputBuffer) {
      const info = parseInfoLine(line);
      if (info && info.bestMove && info.score !== undefined) {
        const pvIndex = info.multipv ?? 1;
        // Only keep the highest depth for each multipv
        const existing = results.get(pvIndex);
        if (
          !existing ||
          (info.depth && info.depth > (existing as BestMove & { depth?: number }).depth!)
        ) {
          results.set(pvIndex, {
            move: info.bestMove,
            score: info.score,
            pv: info.pv,
          });
        }
      }
    }

    // Convert to array, sorted by multipv index
    const bestMoves: BestMove[] = [];
    for (let i = 1; i <= count; i++) {
      const move = results.get(i);
      if (move) {
        bestMoves.push(move);
      }
    }

    // Reset MultiPV to 1
    if (count > 1) {
      await this.sendCommand('setoption name MultiPV value 1');
    }

    return bestMoves;
  }

  /**
   * Terminate the engine
   */
  async quit(): Promise<void> {
    if (this.engine) {
      this.engine.postMessage('quit');
      this.engine.terminate();
      this.engine = null;
      this.initialized = false;
    }
  }

  /**
   * Get the current position FEN
   */
  getCurrentFen(): string {
    return this.currentFen;
  }

  /**
   * Check if engine is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Set engine option
   */
  async setOption(name: string, value: string | number | boolean): Promise<void> {
    this.ensureInitialized();
    await this.sendCommand(`setoption name ${name} value ${value}`);
    await this.sendCommand('isready', 'readyok');
  }

  /**
   * Request new game (clears hash, etc.)
   */
  async newGame(): Promise<void> {
    this.ensureInitialized();
    this.engine!.postMessage('ucinewgame');
    await this.sendCommand('isready', 'readyok');
    this.currentFen = STARTPOS_FEN;
  }

  /**
   * Stop current search
   */
  stop(): void {
    if (this.engine) {
      this.engine.postMessage('stop');
    }
  }

  /**
   * Evaluate the current position
   * @param options - Search options (depth or movetime)
   * @returns Full position evaluation
   */
  async evaluatePosition(options?: GetBestMovesOptions): Promise<PositionEvaluation> {
    this.ensureInitialized();

    // Get best moves (includes evaluation)
    const bestMoves = await this.getBestMoves({
      depth: options?.depth ?? 20,
      movetime: options?.movetime,
      count: 1,
    });

    if (bestMoves.length === 0) {
      throw new Error('No evaluation available');
    }

    const best = bestMoves[0];

    // Get the last info line with full data
    let lastInfo: Partial<PositionEvaluation> = {};
    for (const line of this.outputBuffer) {
      const info = parseInfoLine(line);
      if (info && info.depth !== undefined) {
        lastInfo = { ...lastInfo, ...info };
      }
    }

    return {
      score: best.score,
      bestMove: best.move,
      pv: best.pv ?? [best.move],
      depth: lastInfo.depth ?? options?.depth ?? 20,
      nodes: lastInfo.nodes,
      nps: lastInfo.nps,
      time: lastInfo.time,
    };
  }

  /**
   * Get evaluation in human-readable format
   * @param options - Search options
   * @returns Formatted score string (e.g., "+1.5" or "M3")
   */
  async getFormattedEvaluation(options?: GetBestMovesOptions): Promise<string> {
    const evaluation = await this.evaluatePosition(options);
    return formatScore(evaluation.score);
  }

  /**
   * Analyze a played move compared to the best move
   * @param positionFen - FEN before the move
   * @param playedMove - The move that was played (UCI format)
   * @param options - Analysis options
   * @returns Move analysis with CPL and classification
   */
  async analyzeMove(
    positionFen: string,
    playedMove: string,
    options?: GetBestMovesOptions
  ): Promise<MoveAnalysis> {
    this.ensureInitialized();

    const depth = options?.depth ?? 20;

    // Get the top 3 moves for the position before the played move
    await this.setPosition(positionFen);
    const topMoves = await this.getBestMoves({ depth, count: 3 });

    if (topMoves.length === 0) {
      throw new Error('No analysis available');
    }

    const bestMove = topMoves[0];

    // Check if played move is the best move
    if (playedMove === bestMove.move) {
      const { classification, accuracy } = classifyMove(0);
      return {
        playedMove,
        bestMove: bestMove.move,
        centipawnLoss: 0,
        classification,
        accuracy,
        evalAfterPlayed: bestMove.score,
        evalAfterBest: bestMove.score,
        alternatives: topMoves,
      };
    }

    // Check if played move is in top moves
    const playedMoveData = topMoves.find((m) => m.move === playedMove);

    if (playedMoveData) {
      // Played move is in top 3, use its score directly
      const cpl = Math.abs(bestMove.score - playedMoveData.score);
      const { classification, accuracy } = classifyMove(cpl);

      return {
        playedMove,
        bestMove: bestMove.move,
        centipawnLoss: cpl,
        classification,
        accuracy,
        evalAfterPlayed: playedMoveData.score,
        evalAfterBest: bestMove.score,
        alternatives: topMoves,
      };
    }

    // Played move not in top 3, need to evaluate it separately
    // Apply the played move and evaluate the resulting position
    await this.setPosition(positionFen, [playedMove]);
    const evalAfterPlayed = await this.evaluatePosition({ depth });

    // Score is from opponent's perspective, so negate it
    const playedScore = -evalAfterPlayed.score;
    const cpl = Math.max(0, bestMove.score - playedScore);
    const { classification, accuracy } = classifyMove(cpl);

    return {
      playedMove,
      bestMove: bestMove.move,
      centipawnLoss: cpl,
      classification,
      accuracy,
      evalAfterPlayed: playedScore,
      evalAfterBest: bestMove.score,
      alternatives: topMoves,
    };
  }

  // Private methods

  private ensureInitialized(): void {
    if (!this.initialized || !this.engine) {
      throw new Error('Engine not initialized. Call init() first.');
    }
  }

  private handleOutput(line: string): void {
    this.outputBuffer.push(line);

    // Check if we're waiting for a specific response
    if (this.resolveCallback) {
      // Check for expected responses
      if (line === 'uciok' || line === 'readyok' || line.startsWith('bestmove')) {
        const resolve = this.resolveCallback;
        this.resolveCallback = null;
        resolve(line);
      }
    }
  }

  private async sendCommand(command: string, waitFor?: string): Promise<string | void> {
    return new Promise((resolve, reject) => {
      if (!this.engine) {
        reject(new Error('Engine not available'));
        return;
      }

      if (waitFor) {
        // Set up callback for expected response
        const timeout = setTimeout(() => {
          this.resolveCallback = null;
          reject(new Error(`Timeout waiting for ${waitFor}`));
        }, 30000); // 30 second timeout

        this.resolveCallback = (line) => {
          clearTimeout(timeout);
          resolve(line as string);
        };
      }

      this.engine.postMessage(command);

      if (!waitFor) {
        resolve();
      }
    });
  }

  private async applyOptions(): Promise<void> {
    const opts = this.options;

    if (opts.hash !== undefined) {
      await this.sendCommand(`setoption name Hash value ${opts.hash}`);
    }
    if (opts.skillLevel !== undefined) {
      await this.sendCommand(`setoption name Skill Level value ${opts.skillLevel}`);
    }
    if (opts.multiPV !== undefined) {
      await this.sendCommand(`setoption name MultiPV value ${opts.multiPV}`);
    }
    if (opts.limitStrength !== undefined) {
      await this.sendCommand(`setoption name UCI_LimitStrength value ${opts.limitStrength}`);
    }
    if (opts.elo !== undefined) {
      await this.sendCommand(`setoption name UCI_Elo value ${opts.elo}`);
    }
  }
}

/**
 * Create and initialize a Stockfish engine instance
 * Convenience function for simple usage
 */
export async function createEngine(options?: EngineOptions): Promise<StockfishEngine> {
  const engine = new StockfishEngine(options);
  await engine.init();
  return engine;
}

export default StockfishEngine;
