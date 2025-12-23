/**
 * Explanation Modal Component
 *
 * Displays move explanations in a glassmorphic modal.
 * Shows why a move is strong and explains its ranking.
 */

/**
 * Content structure for move explanations
 */
export interface ExplanationContent {
  /** Move notation (e.g., "Nf3") */
  notation: string;
  /** English description (e.g., "Knight moves to f3") */
  description?: string;
  /** Bullet points of why move is strong */
  strengths: string[];
  /** Why it's ranked #1, #2, or #3 */
  ranking?: string;
  /** Rank number (1, 2, or 3) */
  rank: number;
  /** Chess concepts demonstrated (e.g., ["Development", "Central Control"]) */
  concepts: string[];
}

/**
 * Modal component for displaying move explanations
 */
export class ExplanationModal {
  private modalElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;

  /**
   * Show explanation modal with content
   */
  show(content: ExplanationContent): void {
    this.close(); // Close any existing modal

    this.createModal(content);
    this.attachEventListeners();
  }

  /**
   * Create modal DOM structure
   */
  private createModal(content: ExplanationContent): void {
    // Create overlay
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'explanation-overlay';

    // Create modal
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'explanation-modal';

    // Create header
    const header = document.createElement('div');
    header.className = 'explanation-header';

    const title = document.createElement('h3');
    title.className = 'explanation-title';
    title.textContent = content.notation;
    if (content.description) {
      title.textContent += ` — ${content.description}`;
    }
    header.appendChild(title);

    const closeButton = document.createElement('button');
    closeButton.className = 'explanation-close';
    closeButton.setAttribute('aria-label', 'Close explanation');
    closeButton.textContent = '×';
    header.appendChild(closeButton);

    this.modalElement.appendChild(header);

    // Create body
    const body = document.createElement('div');
    body.className = 'explanation-body';

    // Strengths section
    const strengthsSection = document.createElement('div');
    strengthsSection.className = 'explanation-section';

    const strengthsHeading = document.createElement('h4');
    strengthsHeading.textContent = 'Why this move is strong:';
    strengthsSection.appendChild(strengthsHeading);

    const strengthsList = document.createElement('ul');
    content.strengths.forEach((strength) => {
      const li = document.createElement('li');
      li.textContent = strength;
      strengthsList.appendChild(li);
    });
    strengthsSection.appendChild(strengthsList);

    body.appendChild(strengthsSection);

    // Ranking section (if present)
    if (content.ranking) {
      const rankingSection = document.createElement('div');
      rankingSection.className = 'explanation-section';

      const rankingHeading = document.createElement('h4');
      rankingHeading.textContent = `Why it's ranked #${content.rank}:`;
      rankingSection.appendChild(rankingHeading);

      const rankingText = document.createElement('p');
      rankingText.textContent = content.ranking;
      rankingSection.appendChild(rankingText);

      body.appendChild(rankingSection);
    }

    // Concepts section (if present)
    if (content.concepts.length > 0) {
      const conceptsSection = document.createElement('div');
      conceptsSection.className = 'explanation-section';

      const conceptsHeading = document.createElement('h4');
      conceptsHeading.textContent = 'Concepts:';
      conceptsSection.appendChild(conceptsHeading);

      const conceptsText = document.createElement('p');
      conceptsText.className = 'explanation-concepts';
      conceptsText.textContent = content.concepts.join(', ');
      conceptsSection.appendChild(conceptsText);

      body.appendChild(conceptsSection);
    }

    this.modalElement.appendChild(body);

    // Append to document
    document.body.appendChild(this.overlayElement);
    document.body.appendChild(this.modalElement);

    // Trigger animation
    requestAnimationFrame(() => {
      this.overlayElement?.classList.add('visible');
      this.modalElement?.classList.add('visible');
    });
  }

  /**
   * Attach event listeners for closing
   */
  private attachEventListeners(): void {
    // Close button
    const closeButton = this.modalElement?.querySelector('.explanation-close');
    closeButton?.addEventListener('click', () => this.close());

    // Prevent modal click from closing
    this.modalElement?.addEventListener('click', (e) => e.stopPropagation());

    // Click outside to close - use capture phase and check if target is the overlay
    // Wait for next frame to ensure bubble click is fully processed
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.overlayElement?.addEventListener(
          'click',
          (e) => {
            // Only close if the actual overlay was clicked, not bubbled from child
            if (e.target === this.overlayElement) {
              this.close();
            }
          },
          true
        ); // Use capture phase
      });
    });

    // Escape key to close
    document.addEventListener('keydown', this.handleKeydown);
  }

  /**
   * Handle keyboard events
   */
  private handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.close();
    }
  };

  /**
   * Close and cleanup modal
   */
  close(): void {
    document.removeEventListener('keydown', this.handleKeydown);

    this.modalElement?.classList.remove('visible');
    this.overlayElement?.classList.remove('visible');

    setTimeout(() => {
      this.modalElement?.remove();
      this.overlayElement?.remove();
      this.modalElement = null;
      this.overlayElement = null;
    }, 200); // Match CSS transition duration
  }

  /**
   * Check if modal is currently open
   */
  isOpen(): boolean {
    return this.modalElement !== null;
  }
}
