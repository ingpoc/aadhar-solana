/**
 * Test Utilities for Web Frontend
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Import mocks to ensure they're loaded
import './mocks';

// ============== Custom Render ==============

interface WrapperProps {
  children: ReactNode;
}

/**
 * Default wrapper with all providers
 */
function DefaultWrapper({ children }: WrapperProps) {
  return <>{children}</>;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  wrapper?: React.ComponentType<WrapperProps>;
}

/**
 * Custom render function that wraps components with providers
 */
function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const { wrapper: Wrapper = DefaultWrapper, ...renderOptions } = options;

  const user = userEvent.setup();

  const result = render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  });

  return {
    ...result,
    user,
  };
}

// ============== Async Helpers ==============

/**
 * Wait for element to be removed
 */
export async function waitForElementToBeRemoved(
  callback: () => HTMLElement | null
): Promise<void> {
  await waitFor(() => {
    expect(callback()).toBeNull();
  });
}

/**
 * Wait for loading to complete
 */
export async function waitForLoadingToComplete(container: HTMLElement): Promise<void> {
  await waitFor(() => {
    const loadingElements = container.querySelectorAll('[data-testid="loading"]');
    expect(loadingElements.length).toBe(0);
  });
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============== Mock Helpers ==============

/**
 * Create a mock function with typed return value
 */
export function createMockFn<T>() {
  return vi.fn<[], T>();
}

/**
 * Create a mock resolved value function
 */
export function createMockResolvedFn<T>(value: T) {
  return vi.fn().mockResolvedValue(value);
}

/**
 * Create a mock rejected value function
 */
export function createMockRejectedFn(error: Error | string) {
  return vi.fn().mockRejectedValue(typeof error === 'string' ? new Error(error) : error);
}

// ============== Event Helpers ==============

/**
 * Trigger a custom event
 */
export function triggerEvent(eventName: string, detail?: any): void {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

/**
 * Simulate window resize
 */
export function simulateResize(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
  window.dispatchEvent(new Event('resize'));
}

// ============== Assertion Helpers ==============

/**
 * Assert element has class
 */
export function expectToHaveClass(element: HTMLElement, className: string): void {
  expect(element.classList.contains(className)).toBe(true);
}

/**
 * Assert element is visible
 */
export function expectToBeVisible(element: HTMLElement): void {
  expect(element).toBeVisible();
}

/**
 * Assert element has attribute
 */
export function expectToHaveAttribute(
  element: HTMLElement,
  name: string,
  value?: string
): void {
  if (value !== undefined) {
    expect(element.getAttribute(name)).toBe(value);
  } else {
    expect(element.hasAttribute(name)).toBe(true);
  }
}

// ============== Data Test ID Helpers ==============

/**
 * Get element by test ID
 */
export function getByTestId(container: HTMLElement, testId: string): HTMLElement {
  const element = container.querySelector(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Element with test ID "${testId}" not found`);
  }
  return element as HTMLElement;
}

/**
 * Query element by test ID (may return null)
 */
export function queryByTestId(container: HTMLElement, testId: string): HTMLElement | null {
  return container.querySelector(`[data-testid="${testId}"]`);
}

// ============== Form Helpers ==============

/**
 * Fill form field
 */
export async function fillField(
  user: ReturnType<typeof userEvent.setup>,
  element: HTMLElement,
  value: string
): Promise<void> {
  await user.clear(element);
  await user.type(element, value);
}

/**
 * Submit form
 */
export async function submitForm(
  user: ReturnType<typeof userEvent.setup>,
  form: HTMLFormElement
): Promise<void> {
  const submitButton = form.querySelector('[type="submit"]');
  if (submitButton) {
    await user.click(submitButton);
  } else {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
}

// ============== Hook Testing Helpers ==============

interface HookResult<T> {
  current: T;
}

/**
 * Simple hook tester for testing custom hooks
 * Note: For more complex scenarios, use @testing-library/react-hooks
 */
export function createHookTester<T>(hook: () => T): {
  result: HookResult<T>;
  rerender: () => void;
} {
  let result: HookResult<T> = { current: undefined as T };

  const TestComponent = () => {
    result.current = hook();
    return null;
  };

  const { rerender } = render(<TestComponent />);

  return {
    result,
    rerender: () => rerender(<TestComponent />),
  };
}

// ============== Exports ==============

export { customRender as render };
export { userEvent };
export * from '@testing-library/react';
export { vi } from 'vitest';
