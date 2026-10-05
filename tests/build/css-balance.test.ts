// Merges between lanes that both append to the same stylesheet can drop a closing brace, which silently voids every
// rule after it (B9b: the tier marks vanished). Each stylesheet must balance its braces, ignoring comments and strings.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(process.cwd(), 'src', 'ui');
const sheets = readdirSync(DIR).filter((f) => f.endsWith('.css'));

/** The lowest and final brace depth of a stylesheet, skipping comments and quoted strings. */
function depths(src: string): { min: number; end: number } {
  let depth = 0;
  let min = 0;
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '/' && src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2);
      i = close < 0 ? src.length : close + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== ch) j += src[j] === '\\' ? 2 : 1;
      i = j + 1;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') min = Math.min(min, --depth);
    i++;
  }
  return { min, end: depth };
}

describe('stylesheets', () => {
  it.each(sheets)('%s balances its braces and never closes one it did not open', (file) => {
    const d = depths(readFileSync(join(DIR, file), 'utf8'));
    expect(d.min).toBe(0);
    expect(d.end).toBe(0);
  });
});
