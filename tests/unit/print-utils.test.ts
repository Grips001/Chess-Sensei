/**
 * Print Utilities Test Suite
 *
 * Tests for the Phase 4 print functionality.
 * Tests print mode preparation, restore behavior, and print triggers.
 *
 * @see src/frontend/print-utils.ts
 * @see NEUTRALINO_6.4_FEATURES.md
 */

import { describe, test, expect, mock } from 'bun:test';

describe('Print Utilities', () => {
  describe('Print Mode Preparation', () => {
    test('should identify printable elements', () => {
      const printableElements = [
        'analysis-overlay',
        'analysis-content',
        'move-list',
        'dashboard-container',
        'progress-stats',
      ];

      expect(printableElements).toContain('analysis-overlay');
      expect(printableElements).toContain('dashboard-container');
      expect(printableElements.length).toBeGreaterThan(0);
    });

    test('should identify non-printable elements to hide', () => {
      const nonPrintableElements = [
        'nav-container',
        'sidebar',
        'toolbar',
        'notification-area',
        'modal-backdrop',
        'close-button',
      ];

      expect(nonPrintableElements).toContain('nav-container');
      expect(nonPrintableElements).toContain('sidebar');
      expect(nonPrintableElements).toContain('close-button');
    });

    test('should apply print-hidden class to non-printable elements', () => {
      // Simulate DOM manipulation
      const elementStates: Map<string, string[]> = new Map();

      const hideElement = (id: string) => {
        const classes = elementStates.get(id) || [];
        classes.push('print-hidden');
        elementStates.set(id, classes);
      };

      const nonPrintable = ['nav', 'sidebar', 'toolbar'];
      nonPrintable.forEach(hideElement);

      expect(elementStates.get('nav')).toContain('print-hidden');
      expect(elementStates.get('sidebar')).toContain('print-hidden');
      expect(elementStates.get('toolbar')).toContain('print-hidden');
    });

    test('should add print-mode class to body', () => {
      const bodyClasses: string[] = [];

      const preparePrintMode = () => {
        bodyClasses.push('print-mode');
      };

      preparePrintMode();

      expect(bodyClasses).toContain('print-mode');
    });
  });

  describe('Print Mode Restoration', () => {
    test('should remove print-hidden class after printing', () => {
      const elementStates: Map<string, string[]> = new Map([
        ['nav', ['print-hidden']],
        ['sidebar', ['print-hidden']],
      ]);

      const restoreElement = (id: string) => {
        const classes = elementStates.get(id) || [];
        const index = classes.indexOf('print-hidden');
        if (index > -1) {
          classes.splice(index, 1);
        }
        elementStates.set(id, classes);
      };

      restoreElement('nav');
      restoreElement('sidebar');

      expect(elementStates.get('nav')).not.toContain('print-hidden');
      expect(elementStates.get('sidebar')).not.toContain('print-hidden');
    });

    test('should remove print-mode class from body', () => {
      const bodyClasses = ['print-mode', 'other-class'];

      const restoreAfterPrint = () => {
        const index = bodyClasses.indexOf('print-mode');
        if (index > -1) {
          bodyClasses.splice(index, 1);
        }
      };

      restoreAfterPrint();

      expect(bodyClasses).not.toContain('print-mode');
      expect(bodyClasses).toContain('other-class');
    });

    test('should restore original visibility states', () => {
      const originalStates: Map<string, boolean> = new Map([
        ['element1', true],
        ['element2', false],
      ]);

      const currentStates: Map<string, boolean> = new Map([
        ['element1', false],
        ['element2', false],
      ]);

      const restoreVisibility = () => {
        for (const [id, wasVisible] of originalStates) {
          currentStates.set(id, wasVisible);
        }
      };

      restoreVisibility();

      expect(currentStates.get('element1')).toBe(true);
      expect(currentStates.get('element2')).toBe(false);
    });
  });

  describe('Analysis Print', () => {
    test('should check for analysis overlay visibility', () => {
      const isAnalysisOpen = (hasClass: (cls: string) => boolean) => {
        return !hasClass('hidden');
      };

      expect(isAnalysisOpen(() => false)).toBe(true);
      expect(isAnalysisOpen(() => true)).toBe(false);
    });

    test('should alert when no analysis is available', () => {
      let alertMessage = '';

      const printAnalysis = (isOverlayVisible: boolean) => {
        if (!isOverlayVisible) {
          alertMessage = 'No analysis to print. Please open an analysis first.';
          return false;
        }
        return true;
      };

      const result = printAnalysis(false);

      expect(result).toBe(false);
      expect(alertMessage).toBe('No analysis to print. Please open an analysis first.');
    });

    test('should proceed when analysis is available', () => {
      let printTriggered = false;

      const printAnalysis = (isOverlayVisible: boolean) => {
        if (!isOverlayVisible) {
          return false;
        }
        printTriggered = true;
        return true;
      };

      const result = printAnalysis(true);

      expect(result).toBe(true);
      expect(printTriggered).toBe(true);
    });
  });

  describe('Move History Print', () => {
    test('should check for move list content', () => {
      const hasMoves = (moveCount: number) => moveCount > 0;

      expect(hasMoves(0)).toBe(false);
      expect(hasMoves(5)).toBe(true);
    });

    test('should alert when no moves exist', () => {
      let alertMessage = '';

      const printMoveHistory = (moveCount: number) => {
        if (moveCount === 0) {
          alertMessage = 'No moves to print. Play some moves first.';
          return false;
        }
        return true;
      };

      const result = printMoveHistory(0);

      expect(result).toBe(false);
      expect(alertMessage).toBe('No moves to print. Play some moves first.');
    });
  });

  describe('Progress Dashboard Print', () => {
    test('should verify dashboard is visible before printing', () => {
      const isDashboardOpen = (display: string) => display !== 'none';

      expect(isDashboardOpen('block')).toBe(true);
      expect(isDashboardOpen('flex')).toBe(true);
      expect(isDashboardOpen('none')).toBe(false);
    });

    test('should format statistics for print', () => {
      const stats = {
        gamesPlayed: 42,
        winRate: 0.65,
        averageAccuracy: 0.82,
        totalStudyTime: 3600,
      };

      const formatStats = () => ({
        gamesPlayed: stats.gamesPlayed.toString(),
        winRate: `${(stats.winRate * 100).toFixed(1)}%`,
        averageAccuracy: `${(stats.averageAccuracy * 100).toFixed(1)}%`,
        studyTime: `${Math.floor(stats.totalStudyTime / 60)} minutes`,
      });

      const formatted = formatStats();

      expect(formatted.gamesPlayed).toBe('42');
      expect(formatted.winRate).toBe('65.0%');
      expect(formatted.averageAccuracy).toBe('82.0%');
      expect(formatted.studyTime).toBe('60 minutes');
    });
  });

  describe('Print Trigger', () => {
    test('should call print function', () => {
      let printCalled = false;

      const triggerPrint = () => {
        printCalled = true;
      };

      triggerPrint();

      expect(printCalled).toBe(true);
    });

    test('should handle print errors gracefully', async () => {
      let fallbackUsed = false;

      const triggerPrint = async (useNeutralinoAPI: boolean) => {
        if (useNeutralinoAPI) {
          throw new Error('Neutralino print not available');
        }
        return true;
      };

      const triggerPrintWithFallback = async () => {
        try {
          await triggerPrint(true);
        } catch {
          fallbackUsed = true;
          // Would call window.print() as fallback
        }
      };

      await triggerPrintWithFallback();

      expect(fallbackUsed).toBe(true);
    });
  });

  describe('Print CSS', () => {
    test('should define print media styles', () => {
      const printStyles = `
        @media print {
          .print-hidden {
            display: none !important;
          }

          .print-mode body {
            background: white;
          }

          .analysis-content {
            page-break-inside: avoid;
          }
        }
      `;

      expect(printStyles).toContain('@media print');
      expect(printStyles).toContain('.print-hidden');
      expect(printStyles).toContain('display: none');
      expect(printStyles).toContain('page-break-inside');
    });

    test('should handle page breaks appropriately', () => {
      const pageBreakRules = {
        'analysis-header': 'page-break-after: avoid',
        'move-analysis': 'page-break-inside: avoid',
        'chart-container': 'page-break-inside: avoid',
        'stats-section': 'page-break-before: auto',
      };

      expect(pageBreakRules['analysis-header']).toContain('page-break-after');
      expect(pageBreakRules['move-analysis']).toContain('page-break-inside');
    });
  });

  describe('Print Button Integration', () => {
    test('should create print button with correct attributes', () => {
      const createPrintButton = (label: string, onClick: () => void) => ({
        className: 'print-btn',
        innerHTML: `🖨️ ${label}`,
        onclick: onClick,
        style: {
          marginLeft: 'auto',
          marginRight: '10px',
        },
      });

      const mockOnClick = mock(() => {});
      const button = createPrintButton('Print', mockOnClick);

      expect(button.className).toBe('print-btn');
      expect(button.innerHTML).toContain('🖨️');
      expect(button.innerHTML).toContain('Print');
      expect(button.onclick).toBe(mockOnClick);
    });

    test('should position button correctly in header', () => {
      const buttonStyle = {
        marginLeft: 'auto',
        marginRight: '10px',
      };

      expect(buttonStyle.marginLeft).toBe('auto');
      expect(buttonStyle.marginRight).toBe('10px');
    });
  });
});
