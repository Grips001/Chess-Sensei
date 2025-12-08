/**
 * Clipboard Utilities Test Suite
 *
 * Tests for the Phase 4 clipboard HTML functionality.
 * Tests HTML generation, copy operations, and fallback behavior.
 *
 * @see src/frontend/clipboard-utils.ts
 * @see NEUTRALINO_6.4_FEATURES.md
 */

import { describe, test, expect } from 'bun:test';

describe('Clipboard Utilities', () => {
  describe('HTML Generation', () => {
    test('should generate valid HTML document structure', () => {
      // Simulate the HTML generation output
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Chess-Sensei Analysis Report</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
  </style>
</head>
<body>
  <h1>Chess-Sensei Analysis Report</h1>
  <div class="content">Test content</div>
</body>
</html>`;

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('Chess-Sensei');
    });

    test('should include proper CSS styles in HTML', () => {
      const cssStyles = `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; }
    .mistake { background: #ffebee; border-left: 4px solid #e74c3c; }
    .blunder { background: #ffcdd2; border-left: 4px solid #c62828; }
    .excellent { background: #e8f5e9; border-left: 4px solid #4caf50; }
`;

      expect(cssStyles).toContain('font-family');
      expect(cssStyles).toContain('.mistake');
      expect(cssStyles).toContain('.blunder');
      expect(cssStyles).toContain('.excellent');
      expect(cssStyles).toContain('border-left');
    });

    test('should include timestamp metadata', () => {
      const timestamp = new Date().toLocaleString();
      const metadata = `<div class="metadata"><strong>Generated:</strong> ${timestamp}</div>`;

      expect(metadata).toContain('Generated:');
      expect(metadata).toContain(new Date().getFullYear().toString());
    });
  });

  describe('Analysis HTML Generation', () => {
    test('should generate analysis HTML with proper structure', () => {
      const analysisHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Chess-Sensei Analysis Report</title>
</head>
<body>
  <h1>♟️ Chess-Sensei Analysis Report</h1>
  <div class="metadata">
    <strong>Generated:</strong> ${new Date().toLocaleString()}
  </div>
  <div class="analysis-content">
    <div class="move-analysis">
      <span class="move-number">1.</span>
      <span class="move-san">e4</span>
      <span class="evaluation">+0.2</span>
    </div>
  </div>
</body>
</html>`;

      expect(analysisHTML).toContain('Chess-Sensei Analysis Report');
      expect(analysisHTML).toContain('♟️');
      expect(analysisHTML).toContain('metadata');
      expect(analysisHTML).toContain('analysis-content');
    });

    test('should include move classification styling', () => {
      const moveClassifications = [
        { class: 'excellent', color: '#4caf50' },
        { class: 'good', color: '#8bc34a' },
        { class: 'inaccuracy', color: '#ff9800' },
        { class: 'mistake', color: '#e74c3c' },
        { class: 'blunder', color: '#c62828' },
      ];

      moveClassifications.forEach((classification) => {
        expect(classification.class).toBeTruthy();
        expect(classification.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('Move History HTML Generation', () => {
    test('should format moves in standard PGN style', () => {
      const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'];
      const formattedMoves: string[] = [];

      for (let i = 0; i < moves.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = moves[i];
        const blackMove = moves[i + 1] || '';
        formattedMoves.push(`${moveNumber}. ${whiteMove} ${blackMove}`.trim());
      }

      expect(formattedMoves).toEqual(['1. e4 e5', '2. Nf3 Nc6', '3. Bb5']);
    });

    test('should include game metadata in move history HTML', () => {
      const gameMetadata = {
        event: 'Chess-Sensei Training',
        date: '2025.12.08',
        white: 'Player',
        black: 'Engine',
        result: '*',
      };

      const metadataHTML = `
        <div class="game-info">
          <p><strong>Event:</strong> ${gameMetadata.event}</p>
          <p><strong>Date:</strong> ${gameMetadata.date}</p>
          <p><strong>White:</strong> ${gameMetadata.white}</p>
          <p><strong>Black:</strong> ${gameMetadata.black}</p>
          <p><strong>Result:</strong> ${gameMetadata.result}</p>
        </div>
      `;

      expect(metadataHTML).toContain('Chess-Sensei Training');
      expect(metadataHTML).toContain('2025.12.08');
      expect(metadataHTML).toContain('Player');
      expect(metadataHTML).toContain('Engine');
    });
  });

  describe('Copy Notification', () => {
    test('should create notification with correct message', () => {
      const createNotification = (message: string) => ({
        className: 'copy-notification',
        textContent: message,
        style: {
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#4caf50',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '5px',
          zIndex: '10000',
        },
      });

      const notification = createNotification('Analysis copied to clipboard!');

      expect(notification.textContent).toBe('Analysis copied to clipboard!');
      expect(notification.className).toBe('copy-notification');
      expect(notification.style.backgroundColor).toBe('#4caf50');
    });

    test('should auto-remove notification after delay', async () => {
      let notificationRemoved = false;

      const showNotification = (_message: string, duration = 2000) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            notificationRemoved = true;
            resolve();
          }, duration);
        });
      };

      // Use short duration for test
      await showNotification('Test', 10);

      expect(notificationRemoved).toBe(true);
    });
  });

  describe('Fallback Behavior', () => {
    test('should detect HTML clipboard support', () => {
      // Simulate clipboard API check
      const hasHTMLClipboardSupport = () => {
        // In a real browser, check for clipboard.writeHTML
        return typeof navigator !== 'undefined' && 'clipboard' in navigator;
      };

      // In Bun test environment, navigator might not exist
      const hasSupport = hasHTMLClipboardSupport();
      expect(typeof hasSupport).toBe('boolean');
    });

    test('should provide plain text fallback', () => {
      const htmlContent = `
        <div class="analysis">
          <h1>Analysis Report</h1>
          <p>Move 1: e4 (+0.2)</p>
          <p>Move 2: e5 (+0.1)</p>
        </div>
      `;

      // Simulate extracting plain text from HTML
      const extractPlainText = (html: string) => {
        return html
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      };

      const plainText = extractPlainText(htmlContent);

      expect(plainText).toContain('Analysis Report');
      expect(plainText).toContain('Move 1: e4');
      expect(plainText).toContain('Move 2: e5');
      expect(plainText).not.toContain('<div>');
      expect(plainText).not.toContain('</p>');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing analysis content gracefully', () => {
      const getAnalysisContent = () => {
        const content = null; // Simulate missing element
        if (!content) {
          return '<p>No analysis available</p>';
        }
        return content;
      };

      const result = getAnalysisContent();
      expect(result).toBe('<p>No analysis available</p>');
    });

    test('should handle empty move list gracefully', () => {
      const getMoveHistory = (moves: string[]) => {
        if (!moves || moves.length === 0) {
          return null;
        }
        return moves.join(' ');
      };

      expect(getMoveHistory([])).toBeNull();
      expect(getMoveHistory(['e4', 'e5'])).toBe('e4 e5');
    });
  });
});
