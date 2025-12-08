/**
 * Print Utilities for Chess-Sensei
 *
 * Provides printing functionality for:
 * - Game analysis reports
 * - Move history / PGN
 * - Player progress summaries
 *
 * Uses Neutralino 6.2.0+ window.print() API
 * @see https://neutralino.js.org/docs/api/window/#windowprint
 */

import { window as neuWindow } from '@neutralinojs/lib';
import { frontendLogger } from './frontend-logger';

/**
 * Prepare document for printing
 * Hides non-printable UI elements and adds print-specific styling
 */
function preparePrintMode(): void {
  document.body.classList.add('print-mode');

  // Hide elements that shouldn't be printed
  const noPrintSelectors = [
    '.control-button',
    '.back-button',
    'button',
    '.header-buttons',
    '.close-button',
  ];

  noPrintSelectors.forEach((selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });
  });
}

/**
 * Restore document after printing
 * Removes print-specific styling and restores hidden elements
 */
function restoreAfterPrint(): void {
  document.body.classList.remove('print-mode');

  // Restore all elements
  const allElements = document.querySelectorAll('[style*="display: none"]');
  allElements.forEach((el) => {
    (el as HTMLElement).style.display = '';
  });
}

/**
 * Trigger native print dialog
 */
async function triggerPrint(): Promise<void> {
  try {
    await neuWindow.print();
    frontendLogger.info('Print', 'Print dialog opened successfully');
  } catch (error) {
    frontendLogger.error('Print', 'Failed to open print dialog:', error);
    // Fallback to browser print
    window.print();
  }
}

/**
 * Print the current analysis view
 * Shows game analysis, move evaluation, and insights
 */
export async function printAnalysis(): Promise<void> {
  try {
    frontendLogger.info('Print', 'Printing analysis report');

    const analysisOverlay = document.getElementById('analysis-overlay');
    if (!analysisOverlay || analysisOverlay.classList.contains('hidden')) {
      // eslint-disable-next-line no-alert
      alert('No analysis to print. Please open an analysis first.');
      return;
    }

    // Prepare for printing
    preparePrintMode();

    // Add print title
    const printTitle = document.createElement('div');
    printTitle.className = 'print-title';
    printTitle.innerHTML = `
      <h1>Chess-Sensei Game Analysis</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
    `;
    analysisOverlay.prepend(printTitle);

    // Trigger print
    await triggerPrint();

    // Cleanup
    printTitle.remove();
    restoreAfterPrint();

    frontendLogger.info('Print', 'Analysis print completed');
  } catch (error) {
    frontendLogger.error('Print', 'Failed to print analysis:', error);
    restoreAfterPrint();
    // eslint-disable-next-line no-alert
    alert('Failed to print analysis. Please try again.');
  }
}

/**
 * Print move history as PGN
 * Shows formatted move list with game metadata
 */
export async function printMoveHistory(): Promise<void> {
  try {
    frontendLogger.info('Print', 'Printing move history');

    const moveList = document.getElementById('move-list');
    if (!moveList || !moveList.textContent?.trim()) {
      // eslint-disable-next-line no-alert
      alert('No moves to print. Play some moves first.');
      return;
    }

    // Create printable view
    const printContent = document.createElement('div');
    printContent.className = 'print-move-history';
    printContent.innerHTML = `
      <div class="print-title">
        <h1>Chess-Sensei Move History</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
      </div>
      <div class="move-history-content">
        ${moveList.innerHTML}
      </div>
    `;

    // Temporarily replace body content
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.outerHTML;
    document.body.classList.add('print-mode');

    // Trigger print
    await triggerPrint();

    // Restore original content
    document.body.innerHTML = originalContent;
    document.body.classList.remove('print-mode');

    // Need to re-initialize event listeners after DOM replacement
    // (This will be handled by the main app reload)
    location.reload();
  } catch (error) {
    frontendLogger.error('Print', 'Failed to print move history:', error);
    // eslint-disable-next-line no-alert
    alert('Failed to print move history. Please try again.');
  }
}

/**
 * Print player progress dashboard
 * Shows statistics, ratings, and performance metrics
 */
export async function printProgressDashboard(): Promise<void> {
  try {
    frontendLogger.info('Print', 'Printing progress dashboard');

    const dashboard = document.getElementById('dashboard-content');
    if (!dashboard || dashboard.classList.contains('hidden')) {
      // eslint-disable-next-line no-alert
      alert('No dashboard to print. Please open the Progress Dashboard first.');
      return;
    }

    // Prepare for printing
    preparePrintMode();

    // Add print title to dashboard
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (dashboardContainer) {
      const printTitle = document.createElement('div');
      printTitle.className = 'print-title';
      printTitle.innerHTML = `
        <h1>Chess-Sensei Progress Dashboard</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
      `;
      dashboardContainer.prepend(printTitle);

      // Trigger print
      await triggerPrint();

      // Cleanup
      printTitle.remove();
    }

    restoreAfterPrint();

    frontendLogger.info('Print', 'Progress dashboard print completed');
  } catch (error) {
    frontendLogger.error('Print', 'Failed to print progress dashboard:', error);
    restoreAfterPrint();
    // eslint-disable-next-line no-alert
    alert('Failed to print progress dashboard. Please try again.');
  }
}

/**
 * Print data export summary
 * Shows export/import statistics and data overview
 */
export async function printDataSummary(): Promise<void> {
  try {
    frontendLogger.info('Print', 'Printing data summary');

    const dataContent = document.getElementById('data-mgmt-content');
    if (!dataContent) {
      // eslint-disable-next-line no-alert
      alert('No data to print. Please open Data Management first.');
      return;
    }

    // Prepare for printing
    preparePrintMode();

    // Add print title
    const printTitle = document.createElement('div');
    printTitle.className = 'print-title';
    printTitle.innerHTML = `
      <h1>Chess-Sensei Data Summary</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
    `;
    dataContent.prepend(printTitle);

    // Trigger print
    await triggerPrint();

    // Cleanup
    printTitle.remove();
    restoreAfterPrint();

    frontendLogger.info('Print', 'Data summary print completed');
  } catch (error) {
    frontendLogger.error('Print', 'Failed to print data summary:', error);
    restoreAfterPrint();
    // eslint-disable-next-line no-alert
    alert('Failed to print data summary. Please try again.');
  }
}

/**
 * Add print button to an element
 * Helper function to add print functionality to existing UI
 */
export function addPrintButton(
  containerId: string,
  printFunction: () => Promise<void>,
  buttonText: string = 'Print'
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    frontendLogger.warn('Print', `Container not found: ${containerId}`);
    return;
  }

  // Check if print button already exists
  if (container.querySelector('.print-button')) {
    return;
  }

  const printButton = document.createElement('button');
  printButton.className = 'print-button';
  printButton.textContent = `🖨️ ${buttonText}`;
  printButton.onclick = printFunction;

  // Add button to container header if it exists, otherwise prepend
  const header = container.querySelector('.dashboard-header, .analysis-header, .data-mgmt-header');
  if (header) {
    header.appendChild(printButton);
  } else {
    container.prepend(printButton);
  }

  frontendLogger.debug('Print', `Print button added to ${containerId}`);
}
