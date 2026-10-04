// O2: every term marked bold in docs/v1/rules.md (v1 rules, until the v2 glossary build moves this back to docs/rules.md) (the player-facing sections 1 to 5) has a glossary entry.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GLOSSARY, glossaryFor, LINK_TERMS } from '../../src/core/content/glossary';

const norm = (t: string): string => t.trim().replace(/[.:]+$/, '').replace(/ x$/i, '').toLowerCase();

function boldTerms(): string[] {
  const lines = readFileSync('docs/v1/rules.md', 'utf8').split('\n');
  const end = lines.findIndex((l) => l.startsWith('## 6.')); // sections 6 and 7 are about saves and the simulator
  const out = new Set<string>();
  // Line 3 only explains the bold convention.
  lines.slice(3, end < 0 ? lines.length : end).forEach((l) => {
    for (const m of l.matchAll(/\*\*([^*]+)\*\*/g)) out.add(norm(m[1]));
  });
  return [...out];
}

describe('glossary', () => {
  const have = new Set(GLOSSARY.map((e) => norm(e.term)));
  const plural = (t: string): string => (t.endsWith('s') ? t.slice(0, -1) : t);

  it('has an entry for every bold term in docs/rules.md', () => {
    const terms = boldTerms();
    expect(terms.length).toBeGreaterThan(60);
    const missing = terms.filter((t) => !have.has(t) && !have.has(plural(t)));
    expect(missing).toEqual([]);
  });

  it('has no duplicate terms and every entry has text', () => {
    expect(have.size).toBe(GLOSSARY.length);
    for (const e of GLOSSARY) expect(e.text.length).toBeGreaterThan(8);
  });

  it('has no em dashes', () => {
    for (const e of GLOSSARY) expect(e.text + e.term).not.toContain('—');
  });

  it('every link term resolves to an entry', () => {
    for (const w of LINK_TERMS) expect(glossaryFor(w), w).toBeDefined();
  });
});
