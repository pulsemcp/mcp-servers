import { describe, test, expect } from 'vitest';

describe('Intentionally failing test', () => {
  test('this test should fail', () => {
    // This test is intentionally failing for CI testing
    expect(true).toBe(false);
  });
  
  test('another failing test', () => {
    expect(1 + 1).toBe(3);
  });
});