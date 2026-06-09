import { describe, expect, it } from 'vitest';
import { findClosestColor, generateFieldGrid } from './colorMatch.js';

const palette = [
  { id: 'black', name: 'Black', hex: '#000000' },
  { id: 'white', name: 'White', hex: '#FFFFFF' },
  { id: 'red', name: 'Red', hex: '#CC0000' },
];

describe('findClosestColor', () => {
  it('matches black in lab mode', () => {
    expect(findClosestColor([10, 10, 10], palette, 'lab').id).toBe('black');
  });

  it('matches white in rgb mode', () => {
    expect(findClosestColor([250, 250, 250], palette, 'rgb').id).toBe('white');
  });
});

describe('generateFieldGrid', () => {
  it('generates one cell per grid position', () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 0, 0, 0, 255,
    ]);
    const cells = generateFieldGrid(data, 2, 2, 2, 2, palette, 'rgb');
    expect(cells).toHaveLength(4);
  });
});
