import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { generateIcons, ICONS } from '../../scripts/icons.mjs';

describe('generated icons', () => {
  const icons = generateIcons();

  it('makes every icon as a valid PNG of the right size', () => {
    for (const [name, size] of Object.entries(ICONS)) {
      const png = icons[name];
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(png.readUInt32BE(16)).toBe(size);
      expect(png.readUInt32BE(20)).toBe(size);
      expect(png.subarray(png.length - 8, png.length - 4).toString('ascii')).toBe('IEND');
    }
    expect(Object.keys(icons).sort()).toEqual(['apple-touch-icon.png', 'favicon-32.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']);
  });

  it('is not a flat colour', () => {
    expect(icons['icon-192.png'].length).toBeGreaterThan(1500);
  });

  it('writes nothing image-like into public/ or src/', () => {
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
    const files = [...walk('src'), ...(existsSync('public') ? walk('public') : [])];
    expect(files.filter((f) => /\.(png|ico|jpe?g|gif|webp)$/.test(f))).toEqual([]);
  });
});
