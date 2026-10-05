// Merges between lanes that both append to the same stylesheet can drop a closing brace, which silently voids every
// rule after it (B9b: the tier marks vanished). Each stylesheet must balance its braces, ignoring comments and strings.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(__dirname, '../../src/ui');
const sheets = readdirSync(DIR).filter((f) => f.endsWith('.css'));

describe('stylesheets', () => {
  it.each(sheets)('%s balances its braces and never closes one it did not open', (file) => {
    const src = readFileSync(join(DIR, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/"(?:[^"\]|\.)*"|'(?:[^'\]|\.)*'/g, '""');
    let depth = 0;
    for (const ch of src) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      expect(depth).toBeGreaterThanOrEqual(0);
    }
    expect(depth).toBe(0);
  });
});
