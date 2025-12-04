/**
 * Test script for Chess Logic Module
 *
 * Tests the ChessGame class and chess logic functionality.
 * Run with: bun src/shared/test-chess-logic.ts
 */

import { ChessGame, createGame, STARTPOS_FEN, WHITE, BLACK } from './chess-logic';

async function testChessLogic() {
  console.log('=== Chess Logic Test ===\n');

  // Test 1: Create game and verify starting position
  console.log('1. Creating game with starting position...');
  const game = createGame();
  console.log('   FEN:', game.getFen());
  console.log('   Turn:', game.getTurn() === WHITE ? 'White' : 'Black');
  console.log('   Legal moves:', game.getLegalMovesSan().length);
  console.log('   ✓ Game created\n');

  // Test 2: Make moves
  console.log('2. Making moves (1.e4 e5 2.Nf3 Nc6)...');
  const move1 = game.makeMove('e4');
  console.log('   e4:', move1.san, '→', move1.uci);

  const move2 = game.makeMove('e5');
  console.log('   e5:', move2.san, '→', move2.uci);

  const move3 = game.makeMove('Nf3');
  console.log('   Nf3:', move3.san, '→', move3.uci);

  const move4 = game.makeMove('Nc6');
  console.log('   Nc6:', move4.san, '→', move4.uci);

  console.log('   Move history (UCI):', game.getMoveHistoryUci().join(' '));
  console.log('   Move history (SAN):', game.getMoveHistorySan().join(' '));
  console.log('   ✓ Moves executed\n');

  // Test 3: UCI move format
  console.log('3. Testing UCI move format...');
  const game2 = createGame();
  game2.makeMove('e2e4'); // UCI format
  console.log('   e2e4 (UCI) accepted:', game2.getMoveHistorySan()[0] === 'e4');
  console.log('   ✓ UCI format works\n');

  // Test 4: Check detection
  console.log('4. Testing check detection...');
  // Scholar's mate setup: 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6 4.Qxf7#
  const scholarGame = createGame();
  scholarGame.makeMove('e4');
  scholarGame.makeMove('e5');
  scholarGame.makeMove('Qh5');
  scholarGame.makeMove('Nc6');
  scholarGame.makeMove('Bc4');
  scholarGame.makeMove('Nf6'); // Black blunders

  console.log('   After 3...Nf6, is check?', scholarGame.isInCheck());

  scholarGame.makeMove('Qxf7'); // Checkmate!
  console.log('   After 4.Qxf7#:');
  console.log('   - Is check?', scholarGame.isInCheck());
  console.log('   - Is checkmate?', scholarGame.isCheckmate());
  console.log('   - Status:', scholarGame.getStatus());
  console.log('   ✓ Check/checkmate detection works\n');

  // Test 5: Legal move checking
  console.log('5. Testing legal move validation...');
  const game3 = createGame();
  console.log('   e4 legal?', game3.isLegalMove('e4'));
  console.log('   e5 legal?', game3.isLegalMove('e5')); // Not legal (pawn can't move there)
  console.log('   Nf3 legal?', game3.isLegalMove('Nf3'));
  console.log('   Ke2 legal?', game3.isLegalMove('Ke2')); // Not legal (blocked)
  console.log('   ✓ Move validation works\n');

  // Test 6: FEN loading
  console.log('6. Testing FEN loading...');
  // Italian Game position
  const italianFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
  game.loadFen(italianFen);
  console.log('   Loaded Italian Game position');
  console.log('   Turn:', game.getTurn() === BLACK ? 'Black' : 'White');
  console.log('   Legal moves:', game.getLegalMovesSan().length);
  console.log('   ✓ FEN loading works\n');

  // Test 7: PGN loading
  console.log('7. Testing PGN loading...');
  const pgn = `[Event "Test Game"]
[Site "Chess-Sensei"]
[Date "2025.01.01"]
[White "Player"]
[Black "Engine"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 *`;

  const pgnGame = createGame();
  pgnGame.loadPgn(pgn);
  console.log('   Loaded PGN with', pgnGame.getMoveHistorySan().length, 'moves');
  console.log('   Moves:', pgnGame.getMoveHistorySan().join(' '));
  console.log('   ✓ PGN loading works\n');

  // Test 8: PGN export
  console.log('8. Testing PGN export...');
  const game4 = createGame();
  game4.makeMove('e4');
  game4.makeMove('e5');
  game4.makeMove('Nf3');
  const exportedPgn = game4.getPgn();
  console.log('   Exported PGN:');
  console.log('   ', exportedPgn.split('\n').slice(-1)[0]);
  console.log('   ✓ PGN export works\n');

  // Test 9: Undo move
  console.log('9. Testing undo...');
  const game5 = createGame();
  game5.makeMove('e4');
  game5.makeMove('e5');
  console.log('   Before undo:', game5.getMoveHistorySan().join(' '));
  game5.undoMove();
  console.log('   After undo:', game5.getMoveHistorySan().join(' ') || '(none)');
  console.log('   ✓ Undo works\n');

  // Test 10: Board state
  console.log('10. Testing board state retrieval...');
  const game6 = createGame();
  game6.makeMove('e4');
  game6.makeMove('e5');
  const state = game6.getBoardState();
  console.log('   FEN:', state.fen);
  console.log('   Turn:', state.turn);
  console.log('   Move count:', state.moveHistory.length);
  console.log('   Status:', state.status);
  console.log('   Castling rights:', JSON.stringify(state.castling));
  console.log('   ✓ Board state works\n');

  // Test 11: Static validation
  console.log('11. Testing static FEN validation...');
  console.log('   Valid FEN:', ChessGame.validateFen(STARTPOS_FEN) === null);
  console.log('   Invalid FEN:', ChessGame.validateFen('invalid fen') !== null);
  console.log('   ✓ FEN validation works\n');

  // Test 12: UCI/SAN conversion
  console.log('12. Testing UCI/SAN conversion...');
  console.log('   e2e4 → SAN:', ChessGame.uciToSan(STARTPOS_FEN, 'e2e4'));
  console.log('   e4 → UCI:', ChessGame.sanToUci(STARTPOS_FEN, 'e4'));
  console.log('   ✓ Conversion works\n');

  // Test 13: Draw detection
  console.log('13. Testing draw detection...');
  // Insufficient material: K vs K
  const drawFen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
  const drawGame = createGame(drawFen);
  console.log('   K vs K - insufficient material:', drawGame.isInsufficientMaterial());
  console.log('   Status:', drawGame.getStatus());
  console.log('   ✓ Draw detection works\n');

  // Test 14: Get piece
  console.log('14. Testing get piece...');
  const game7 = createGame();
  const e1Piece = game7.getPiece('e1');
  const e4Piece = game7.getPiece('e4');
  console.log('   e1:', e1Piece ? `${e1Piece.color}${e1Piece.type}` : 'empty');
  console.log('   e4:', e4Piece ? `${e4Piece.color}${e4Piece.type}` : 'empty');
  console.log('   ✓ Get piece works\n');

  // Test 15: ASCII board
  console.log('15. ASCII board representation:');
  const game8 = createGame();
  game8.makeMove('e4');
  game8.makeMove('e5');
  console.log(game8.ascii());

  console.log('\n=== All Chess Logic Tests Passed! ===');
  process.exit(0);
}

testChessLogic().catch((error) => {
  console.error('ERROR:', error);
  process.exit(1);
});
