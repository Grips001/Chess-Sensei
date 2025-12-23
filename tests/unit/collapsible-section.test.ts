/**
 * Unit Tests for CollapsibleSection Component (CS-003)
 *
 * Tests section creation, toggle functionality, content management, and keyboard navigation.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { CollapsibleSection } from '../../src/frontend/components/collapsible-section';

describe('CollapsibleSection', () => {
  let section: CollapsibleSection;
  let container: HTMLElement;

  beforeEach(() => {
    // Create a container for the section
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    test('creates section with default expanded state', () => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test Section',
        icon: '📝',
        expanded: true,
      });

      expect(section).toBeDefined();
      expect(section.isExpanded()).toBe(true);
    });

    test('creates section with collapsed state', () => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test Section',
        icon: '📝',
        expanded: false,
      });

      expect(section.isExpanded()).toBe(false);
    });

    test('creates section with custom icon', () => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test Section',
        icon: '🎮',
        expanded: true,
      });

      const element = section.getElement();
      const icon = element.querySelector('.section-icon');
      expect(icon?.textContent).toBe('🎮');
    });
  });

  describe('DOM structure', () => {
    beforeEach(() => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test Section',
        icon: '📝',
        expanded: true,
      });
      container.appendChild(section.getElement());
    });

    test('creates section with correct class', () => {
      const element = section.getElement();
      expect(element.classList.contains('collapsible-section')).toBe(true);
    });

    test('creates header with title', () => {
      const element = section.getElement();
      const title = element.querySelector('.section-title');
      expect(title?.textContent).toBe('Test Section');
    });

    test('creates header with icon', () => {
      const element = section.getElement();
      const icon = element.querySelector('.section-icon');
      expect(icon?.textContent).toBe('📝');
    });

    test('creates content container', () => {
      const content = section.getContent();
      expect(content).toBeDefined();
      expect(content.classList.contains('section-content')).toBe(true);
    });

    test('sets ARIA attributes for accessibility', () => {
      const element = section.getElement();
      const header = element.querySelector('.section-header');
      const content = element.querySelector('.section-content');

      expect(header?.getAttribute('role')).toBe('button');
      expect(header?.getAttribute('tabindex')).toBe('0');
      expect(header?.hasAttribute('aria-expanded')).toBe(true);
      // Content has role="region" and aria-labelledby (not aria-hidden)
      expect(content?.getAttribute('role')).toBe('region');
    });
  });

  describe('expand and collapse', () => {
    beforeEach(() => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test Section',
        icon: '📝',
        expanded: true,
      });
      container.appendChild(section.getElement());
    });

    test('collapses when expanded', () => {
      expect(section.isExpanded()).toBe(true);

      section.collapse();

      expect(section.isExpanded()).toBe(false);
    });

    test('expands when collapsed', () => {
      section.collapse();
      expect(section.isExpanded()).toBe(false);

      section.expand();

      expect(section.isExpanded()).toBe(true);
    });

    test('updates container visibility class on collapse', () => {
      const element = section.getElement();

      section.collapse();

      // Classes are applied to container, not content
      expect(element.classList.contains('collapsed')).toBe(true);
      expect(element.classList.contains('expanded')).toBe(false);
    });

    test('updates container visibility class on expand', () => {
      section.collapse();
      const element = section.getElement();

      section.expand();

      // Classes are applied to container, not content
      expect(element.classList.contains('expanded')).toBe(true);
      expect(element.classList.contains('collapsed')).toBe(false);
    });

    test('updates ARIA attributes on collapse', () => {
      const element = section.getElement();
      const header = element.querySelector('.section-header');

      section.collapse();

      expect(header?.getAttribute('aria-expanded')).toBe('false');
    });

    test('updates ARIA attributes on expand', () => {
      section.collapse();
      const element = section.getElement();
      const header = element.querySelector('.section-header');

      section.expand();

      expect(header?.getAttribute('aria-expanded')).toBe('true');
    });

    test('chevron is present in header', () => {
      const element = section.getElement();
      const chevron = element.querySelector('.section-chevron');

      // Chevron character remains constant; CSS rotation handles visual change
      expect(chevron).not.toBeNull();
      expect(chevron?.textContent).toBe('▼');
    });
  });

  describe('toggle', () => {
    beforeEach(() => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test Section',
        icon: '📝',
        expanded: true,
      });
      container.appendChild(section.getElement());
    });

    test('toggles from expanded to collapsed', () => {
      expect(section.isExpanded()).toBe(true);

      section.toggle();

      expect(section.isExpanded()).toBe(false);
    });

    test('toggles from collapsed to expanded', () => {
      section.collapse();
      expect(section.isExpanded()).toBe(false);

      section.toggle();

      expect(section.isExpanded()).toBe(true);
    });

    test('toggles multiple times', () => {
      section.toggle(); // collapsed
      expect(section.isExpanded()).toBe(false);

      section.toggle(); // expanded
      expect(section.isExpanded()).toBe(true);

      section.toggle(); // collapsed
      expect(section.isExpanded()).toBe(false);
    });
  });

  describe('content management', () => {
    beforeEach(() => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test Section',
        icon: '📝',
        expanded: true,
      });
      container.appendChild(section.getElement());
    });

    test('sets HTML content', () => {
      section.setContent('<p>Test content</p>');

      const content = section.getContent();
      expect(content.innerHTML).toBe('<p>Test content</p>');
    });

    test('appends DOM element content', () => {
      section.setContent('<p>Initial content</p>');

      const appendedElement = document.createElement('p');
      appendedElement.textContent = 'Appended content';
      section.appendContent(appendedElement);

      const content = section.getContent();
      expect(content.innerHTML).toBe('<p>Initial content</p><p>Appended content</p>');
    });

    test('clears content', () => {
      section.setContent('<p>Test content</p>');
      section.clearContent();

      const content = section.getContent();
      expect(content.innerHTML).toBe('');
    });

    test('appends DOM element', () => {
      const div = document.createElement('div');
      div.id = 'test-div';
      div.textContent = 'Test';

      section.getContent().appendChild(div);

      const content = section.getContent();
      const appendedDiv = content.querySelector('#test-div');
      expect(appendedDiv).not.toBeNull();
      expect(appendedDiv?.textContent).toBe('Test');
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test Section',
        icon: '📝',
        expanded: true,
      });
      container.appendChild(section.getElement());
    });

    test('toggles on Enter key', () => {
      const header = section.getElement().querySelector('.section-header') as HTMLElement;
      const initialState = section.isExpanded();

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      header.dispatchEvent(event);

      expect(section.isExpanded()).toBe(!initialState);
    });

    test('toggles on Space key', () => {
      const header = section.getElement().querySelector('.section-header') as HTMLElement;
      const initialState = section.isExpanded();

      const event = new KeyboardEvent('keydown', { key: ' ' });
      header.dispatchEvent(event);

      expect(section.isExpanded()).toBe(!initialState);
    });

    test('does not toggle on other keys', () => {
      const header = section.getElement().querySelector('.section-header') as HTMLElement;
      const initialState = section.isExpanded();

      const event = new KeyboardEvent('keydown', { key: 'a' });
      header.dispatchEvent(event);

      expect(section.isExpanded()).toBe(initialState);
    });
  });

  describe('click handling', () => {
    beforeEach(() => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test Section',
        icon: '📝',
        expanded: true,
      });
      container.appendChild(section.getElement());
    });

    test('toggles on header click', () => {
      const header = section.getElement().querySelector('.section-header') as HTMLElement;
      const initialState = section.isExpanded();

      header.click();

      expect(section.isExpanded()).toBe(!initialState);
    });

    test('toggles multiple times on repeated clicks', () => {
      const header = section.getElement().querySelector('.section-header') as HTMLElement;

      header.click(); // collapse
      expect(section.isExpanded()).toBe(false);

      header.click(); // expand
      expect(section.isExpanded()).toBe(true);

      header.click(); // collapse
      expect(section.isExpanded()).toBe(false);
    });
  });

  describe('getElement', () => {
    test('returns the section element', () => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test Section',
        icon: '📝',
        expanded: true,
      });

      const element = section.getElement();
      expect(element).toBeInstanceOf(HTMLElement);
      expect(element.classList.contains('collapsible-section')).toBe(true);
    });

    test('returns same element on multiple calls', () => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test Section',
        icon: '📝',
        expanded: true,
      });

      const element1 = section.getElement();
      const element2 = section.getElement();

      expect(element1).toBe(element2);
    });
  });

  describe('getContent', () => {
    test('returns the content container', () => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test Section',
        icon: '📝',
        expanded: true,
      });

      const content = section.getContent();
      expect(content).toBeInstanceOf(HTMLElement);
      expect(content.classList.contains('section-content')).toBe(true);
    });

    test('returns same content on multiple calls', () => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test Section',
        icon: '📝',
        expanded: true,
      });

      const content1 = section.getContent();
      const content2 = section.getContent();

      expect(content1).toBe(content2);
    });
  });

  describe('edge cases', () => {
    test('handles empty title', () => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: '',
        icon: '📝',
        expanded: true,
      });

      const element = section.getElement();
      const title = element.querySelector('.section-title');
      expect(title?.textContent).toBe('');
    });

    test('handles empty icon', () => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test',
        icon: '',
        expanded: true,
      });

      const element = section.getElement();
      const icon = element.querySelector('.section-icon');
      // Empty icon string is falsy, so icon element is not created
      expect(icon).toBeNull();
    });

    test('handles rapid toggle calls', () => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test Section',
        icon: '📝',
        expanded: true,
      });

      section.toggle();
      section.toggle();
      section.toggle();
      section.toggle();

      expect(section.isExpanded()).toBe(true);
    });

    test('handles setting same content multiple times', () => {
      section = new CollapsibleSection({
        id: 'test-section',
        title: 'Test Section',
        icon: '📝',
        expanded: true,
      });

      section.setContent('<p>Test</p>');
      section.setContent('<p>Test</p>');
      section.setContent('<p>Test</p>');

      const content = section.getContent();
      expect(content.innerHTML).toBe('<p>Test</p>');
    });
  });
});
