/**
 * Collapsible Section Component
 *
 * Organizes panel content into collapsible sections with expand/collapse animation.
 * Reduces visual clutter while maintaining quick access to information.
 */

/**
 * Configuration for a collapsible section
 */
export interface CollapsibleSectionConfig {
  /** Unique identifier for the section */
  id: string;
  /** Section title displayed in header */
  title: string;
  /** Initial expanded state (default: true) */
  expanded?: boolean;
  /** Icon to display in header (optional) */
  icon?: string;
}

/**
 * Collapsible section component for organizing panel content
 */
export class CollapsibleSection {
  private container: HTMLElement;
  private header: HTMLElement;
  private content: HTMLElement;
  private config: CollapsibleSectionConfig;
  private expanded: boolean;

  /**
   * Create a new collapsible section
   * @param config - Section configuration
   */
  constructor(config: CollapsibleSectionConfig) {
    this.config = config;
    this.expanded = config.expanded ?? true;

    // Create DOM structure
    this.container = this.createContainer();
    this.header = this.createHeader();
    this.content = this.createContent();

    this.container.appendChild(this.header);
    this.container.appendChild(this.content);

    // Set initial state
    this.updateExpandedState(false); // No animation on initial render
  }

  /**
   * Create section container
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'collapsible-section';
    container.id = `section-${this.config.id}`;
    container.setAttribute('data-section-id', this.config.id);
    return container;
  }

  /**
   * Create section header with title and collapse controls
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'section-header';
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', String(this.expanded));
    header.setAttribute('tabindex', '0');

    // Icon (if provided)
    if (this.config.icon) {
      const icon = document.createElement('span');
      icon.className = 'section-icon';
      icon.textContent = this.config.icon;
      header.appendChild(icon);
    }

    // Title
    const title = document.createElement('h4');
    title.className = 'section-title';
    title.textContent = this.config.title;
    header.appendChild(title);

    // Chevron indicator
    const chevron = document.createElement('span');
    chevron.className = 'section-chevron';
    chevron.textContent = '▼';
    chevron.setAttribute('aria-hidden', 'true');
    header.appendChild(chevron);

    // Click handler
    header.addEventListener('click', () => this.toggle());

    // Keyboard handler
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggle();
      }
    });

    return header;
  }

  /**
   * Create section content container
   */
  private createContent(): HTMLElement {
    const content = document.createElement('div');
    content.className = 'section-content';
    content.setAttribute('role', 'region');
    content.setAttribute('aria-labelledby', `section-${this.config.id}`);
    return content;
  }

  /**
   * Update expanded/collapsed state
   * @param animate - Whether to animate the transition (default: true)
   */
  private updateExpandedState(animate = true): void {
    if (!animate) {
      this.container.classList.add('no-transition');
    }

    if (this.expanded) {
      this.container.classList.add('expanded');
      this.container.classList.remove('collapsed');
      this.content.style.maxHeight = `${this.content.scrollHeight}px`;
    } else {
      this.container.classList.remove('expanded');
      this.container.classList.add('collapsed');
      this.content.style.maxHeight = '0';
    }

    this.header.setAttribute('aria-expanded', String(this.expanded));

    if (!animate) {
      // Force reflow to remove no-transition class
      this.container.offsetHeight;
      this.container.classList.remove('no-transition');
    }
  }

  /**
   * Toggle expanded/collapsed state
   */
  toggle(): void {
    this.expanded = !this.expanded;
    this.updateExpandedState(true);
  }

  /**
   * Expand the section
   */
  expand(): void {
    if (!this.expanded) {
      this.expanded = true;
      this.updateExpandedState(true);
    }
  }

  /**
   * Collapse the section
   */
  collapse(): void {
    if (this.expanded) {
      this.expanded = false;
      this.updateExpandedState(true);
    }
  }

  /**
   * Get the section container element
   */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Get the content container for appending child elements
   */
  getContent(): HTMLElement {
    return this.content;
  }

  /**
   * Check if section is currently expanded
   */
  isExpanded(): boolean {
    return this.expanded;
  }

  /**
   * Set section content from HTML string
   * @param html - HTML content to set
   */
  setContent(html: string): void {
    this.content.innerHTML = html;
    // Update max-height if expanded
    if (this.expanded) {
      this.content.style.maxHeight = `${this.content.scrollHeight}px`;
    }
  }

  /**
   * Append an element to the section content
   * @param element - Element to append
   */
  appendContent(element: HTMLElement): void {
    this.content.appendChild(element);
    // Update max-height if expanded
    if (this.expanded) {
      this.content.style.maxHeight = `${this.content.scrollHeight}px`;
    }
  }

  /**
   * Clear all section content
   */
  clearContent(): void {
    this.content.innerHTML = '';
    if (this.expanded) {
      this.content.style.maxHeight = '0';
    }
  }

  /**
   * Destroy the section and cleanup
   */
  destroy(): void {
    this.container.remove();
  }
}
