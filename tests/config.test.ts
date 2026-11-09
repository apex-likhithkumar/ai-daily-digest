import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('loads and validates the repo config files', () => {
    const config = loadConfig('config');
    expect(config.sources.length).toBeGreaterThan(0);
    expect(config.rules.labels.breaking.minSources).toBe(3);
    expect(Object.keys(config.profile.topics)).toEqual(['A', 'B', 'E', 'F']);
  });

  it('throws a readable error when a file does not match the schema', () => {
    const dir = mkdtempSync(join(tmpdir(), 'digest-config-'));
    copyFileSync('config/profile.yml', join(dir, 'profile.yml'));
    copyFileSync('config/sources.yml', join(dir, 'sources.yml'));
    writeFileSync(join(dir, 'rules.yml'), 'collect: {}\n');
    expect(() => loadConfig(dir)).toThrow(/Invalid config/);
  });
});
