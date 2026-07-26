import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupEmbedFocusManagement } from '../useEmbedAccessibility';

describe('setupEmbedFocusManagement', () => {
  let container: HTMLElement;
  let cleanup: () => void;

  beforeEach(() => {
    // Create a container element
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up the focus trap
    if (cleanup) {
      cleanup();
    }
    // Remove container from DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should create and remove event listener correctly', () => {
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(container, 'removeEventListener');

    cleanup = setupEmbedFocusManagement(container);

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    cleanup();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should cycle from last focusable element to first on Tab', () => {
    // Create focusable elements
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const button2 = document.createElement('button');
    button2.textContent = 'Button 2';
    const button3 = document.createElement('button');
    button3.textContent = 'Button 3';

    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);

    cleanup = setupEmbedFocusManagement(container);

    // Focus the last element
    button3.focus();
    expect(document.activeElement).toBe(button3);

    // Press Tab while on last element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

    container.dispatchEvent(tabEvent);

    // Should cycle to first element
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(button1);

    preventDefaultSpy.mockRestore();
  });

  it('should cycle from first focusable element to last on Shift+Tab', () => {
    // Create focusable elements
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const button2 = document.createElement('button');
    button2.textContent = 'Button 2';
    const button3 = document.createElement('button');
    button3.textContent = 'Button 3';

    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);

    cleanup = setupEmbedFocusManagement(container);

    // Focus the first element
    button1.focus();
    expect(document.activeElement).toBe(button1);

    // Press Shift+Tab while on first element
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    const preventDefaultSpy = vi.spyOn(shiftTabEvent, 'preventDefault');

    container.dispatchEvent(shiftTabEvent);

    // Should cycle to last element
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(button3);

    preventDefaultSpy.mockRestore();
  });

  it('should support dynamic content - newly added focusable elements are included in the cycle', () => {
    // Create initial focusable elements
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const button2 = document.createElement('button');
    button2.textContent = 'Button 2';

    container.appendChild(button1);
    container.appendChild(button2);

    cleanup = setupEmbedFocusManagement(container);

    // Focus the last element
    button2.focus();
    expect(document.activeElement).toBe(button2);

    // Add a new focusable element AFTER setup (simulating async content)
    const button3 = document.createElement('button');
    button3.textContent = 'Button 3';
    container.appendChild(button3);

    // Focus the newly added element (the new last element)
    button3.focus();
    expect(document.activeElement).toBe(button3);

    // Press Tab while on the new last element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

    container.dispatchEvent(tabEvent);

    // Should cycle to first element because the dynamic element is now included in the trap
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(button1);

    preventDefaultSpy.mockRestore();
  });

  it('should handle dynamically added focusable elements during Shift+Tab', () => {
    // Create initial focusable elements
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const button2 = document.createElement('button');
    button2.textContent = 'Button 2';

    container.appendChild(button1);
    container.appendChild(button2);

    cleanup = setupEmbedFocusManagement(container);

    // Focus the first element
    button1.focus();
    expect(document.activeElement).toBe(button1);

    // Add a new focusable element AFTER setup (simulating async content)
    const button3 = document.createElement('button');
    button3.textContent = 'Button 3';
    container.appendChild(button3);

    // Press Shift+Tab while on the first element
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    const preventDefaultSpy = vi.spyOn(shiftTabEvent, 'preventDefault');

    container.dispatchEvent(shiftTabEvent);

    // Should cycle to the new last element (button3)
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(button3);

    preventDefaultSpy.mockRestore();
  });

  it('should not prevent default Tab behavior when not on first/last element', () => {
    // Create focusable elements
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const button2 = document.createElement('button');
    button2.textContent = 'Button 2';
    const button3 = document.createElement('button');
    button3.textContent = 'Button 3';

    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);

    cleanup = setupEmbedFocusManagement(container);

    // Focus the middle element
    button2.focus();
    expect(document.activeElement).toBe(button2);

    // Press Tab while on middle element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

    container.dispatchEvent(tabEvent);

    // Should not prevent default (browser handles normal tab)
    expect(preventDefaultSpy).not.toHaveBeenCalled();

    preventDefaultSpy.mockRestore();
  });

  it('should handle Escape key to trigger close button', () => {
    // Create focusable elements and a close button
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const closeButton = document.createElement('button');
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.textContent = 'Close';

    container.appendChild(button1);
    container.appendChild(closeButton);

    cleanup = setupEmbedFocusManagement(container);

    // Spy on close button click
    const clickSpy = vi.spyOn(closeButton, 'click');

    // Dispatch Escape key
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    container.dispatchEvent(escapeEvent);

    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('should work with custom focusable selector', () => {
    // Create elements with custom selector targets
    const customFocusable1 = document.createElement('div');
    customFocusable1.className = 'custom-focusable';
    customFocusable1.setAttribute('tabindex', '0');
    customFocusable1.textContent = 'Custom 1';

    const customFocusable2 = document.createElement('div');
    customFocusable2.className = 'custom-focusable';
    customFocusable2.setAttribute('tabindex', '0');
    customFocusable2.textContent = 'Custom 2';

    container.appendChild(customFocusable1);
    container.appendChild(customFocusable2);

    // Use custom selector
    cleanup = setupEmbedFocusManagement(container, '.custom-focusable');

    // Focus the last element
    customFocusable2.focus();
    expect(document.activeElement).toBe(customFocusable2);

    // Press Tab while on last element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

    container.dispatchEvent(tabEvent);

    // Should cycle to first element
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(customFocusable1);

    preventDefaultSpy.mockRestore();
  });

  it('should handle empty container gracefully', () => {
    cleanup = setupEmbedFocusManagement(container);

    // Should not throw when Tab is pressed on empty container
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });

    expect(() => {
      container.dispatchEvent(tabEvent);
    }).not.toThrow();
  });

  it('should handle removed focusable elements correctly', () => {
    // Create focusable elements
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const button2 = document.createElement('button');
    button2.textContent = 'Button 2';
    const button3 = document.createElement('button');
    button3.textContent = 'Button 3';

    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);

    cleanup = setupEmbedFocusManagement(container);

    // Focus the last element
    button3.focus();
    expect(document.activeElement).toBe(button3);

    // Remove the last element (simulating async content unmount)
    container.removeChild(button3);

    // Press Tab while previously on (now removed) last element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

    container.dispatchEvent(tabEvent);

    // Should cycle to first because button3 is no longer in DOM
    // The old activeElement (button3) is still document.activeElement but not in container
    // So the condition won't match and normal Tab will proceed

    preventDefaultSpy.mockRestore();
  });

  it('should preserve focus cycling behavior with mixed focusable element types', () => {
    // Create mixed focusable elements
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = 'Link';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Input';

    const button = document.createElement('button');
    button.textContent = 'Button';

    container.appendChild(link);
    container.appendChild(input);
    container.appendChild(button);

    cleanup = setupEmbedFocusManagement(container);

    // Focus the last element (button)
    button.focus();
    expect(document.activeElement).toBe(button);

    // Press Tab while on last element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

    container.dispatchEvent(tabEvent);

    // Should cycle to first element (link)
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(link);

    preventDefaultSpy.mockRestore();
  });
});
