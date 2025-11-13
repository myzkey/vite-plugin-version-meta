import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { versionJsonPlugin } from '../src/index';
import type { ResolvedConfig } from 'vite';

const TEST_DIR = join(process.cwd(), 'test-output');
const PACKAGE_JSON_PATH = join(process.cwd(), 'package.json');

// Mock module for git fallback test
vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
  return {
    ...actual,
    execSync: vi.fn(actual.execSync),
  };
});

// Helper to create mock Vite config
function createMockConfig(outDir = 'dist'): ResolvedConfig {
  return {
    build: {
      outDir,
    },
  } as ResolvedConfig;
}

describe('versionJsonPlugin', () => {
  let originalPackageJson: string;

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });

    // Save original package.json
    if (existsSync(PACKAGE_JSON_PATH)) {
      originalPackageJson = readFileSync(PACKAGE_JSON_PATH, 'utf8');
    }
  });

  afterEach(() => {
    // Restore original package.json
    if (originalPackageJson) {
      writeFileSync(PACKAGE_JSON_PATH, originalPackageJson, 'utf8');
    }

    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }

    vi.restoreAllMocks();
  });

  it('should generate version.json with all fields', () => {
    const testPackageJson = {
      name: 'test-app',
      version: '1.2.3',
    };
    writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(testPackageJson, null, 2), 'utf8');

    const plugin = versionJsonPlugin();

    // Call configResolved hook
    if (plugin.configResolved) {
      (plugin.configResolved as (this: any, config: ResolvedConfig) => void)
        .call({}, createMockConfig(TEST_DIR));
    }

    // Execute the closeBundle hook
    if (plugin.closeBundle) {
      (plugin.closeBundle as (this: any) => void).call({});
    }

    // Verify version.json was created
    const versionJsonPath = join(TEST_DIR, 'version.json');
    expect(existsSync(versionJsonPath)).toBe(true);

    // Verify content
    const content = JSON.parse(readFileSync(versionJsonPath, 'utf8'));
    expect(content.version).toBe('1.2.3');
    expect(content.revision).toBeDefined();
    expect(content.builtAt).toBeDefined();
    expect(new Date(content.builtAt).toISOString()).toBe(content.builtAt);
  });

  it('should use fallback when git is not available', () => {
    const testPackageJson = {
      name: 'test-app',
      version: '2.0.0',
    };
    writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(testPackageJson, null, 2), 'utf8');

    // Mock execSync to simulate git not available
    vi.mocked(execSync).mockImplementationOnce(() => {
      throw new Error('git not found');
    });

    const plugin = versionJsonPlugin({
      fallbackRevision: 'no-git',
    });

    if (plugin.configResolved) {
      (plugin.configResolved as (this: any, config: ResolvedConfig) => void)
        .call({}, createMockConfig(TEST_DIR));
    }

    if (plugin.closeBundle) {
      (plugin.closeBundle as (this: any) => void).call({});
    }

    const versionJsonPath = join(TEST_DIR, 'version.json');
    const content = JSON.parse(readFileSync(versionJsonPath, 'utf8'));

    expect(content.revision).toBe('no-git');
  });

  it('should respect custom fileName option', () => {
    const testPackageJson = {
      name: 'test-app',
      version: '3.0.0',
    };
    writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(testPackageJson, null, 2), 'utf8');

    const plugin = versionJsonPlugin({
      fileName: 'meta.json',
    });

    if (plugin.configResolved) {
      (plugin.configResolved as (this: any, config: ResolvedConfig) => void)
        .call({}, createMockConfig(TEST_DIR));
    }

    if (plugin.closeBundle) {
      (plugin.closeBundle as (this: any) => void).call({});
    }

    const metaJsonPath = join(TEST_DIR, 'meta.json');
    expect(existsSync(metaJsonPath)).toBe(true);

    const content = JSON.parse(readFileSync(metaJsonPath, 'utf8'));
    expect(content.version).toBe('3.0.0');
  });

  it('should only include specified fields', () => {
    const testPackageJson = {
      name: 'test-app',
      version: '4.0.0',
    };
    writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(testPackageJson, null, 2), 'utf8');

    const plugin = versionJsonPlugin({
      fields: ['version'],
    });

    if (plugin.configResolved) {
      (plugin.configResolved as (this: any, config: ResolvedConfig) => void)
        .call({}, createMockConfig(TEST_DIR));
    }

    if (plugin.closeBundle) {
      (plugin.closeBundle as (this: any) => void).call({});
    }

    const versionJsonPath = join(TEST_DIR, 'version.json');
    const content = JSON.parse(readFileSync(versionJsonPath, 'utf8'));

    expect(content.version).toBe('4.0.0');
    expect(content.revision).toBeUndefined();
    expect(content.builtAt).toBeUndefined();
  });

  it('should include multiple selected fields', () => {
    const testPackageJson = {
      name: 'test-app',
      version: '5.0.0',
    };
    writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(testPackageJson, null, 2), 'utf8');

    const plugin = versionJsonPlugin({
      fields: ['version', 'builtAt'],
    });

    if (plugin.configResolved) {
      (plugin.configResolved as (this: any, config: ResolvedConfig) => void)
        .call({}, createMockConfig(TEST_DIR));
    }

    if (plugin.closeBundle) {
      (plugin.closeBundle as (this: any) => void).call({});
    }

    const versionJsonPath = join(TEST_DIR, 'version.json');
    const content = JSON.parse(readFileSync(versionJsonPath, 'utf8'));

    expect(content.version).toBe('5.0.0');
    expect(content.builtAt).toBeDefined();
    expect(content.revision).toBeUndefined();
  });

  it('should support distDir option', () => {
    const testPackageJson = {
      name: 'test-app',
      version: '6.0.0',
    };
    writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(testPackageJson, null, 2), 'utf8');

    const plugin = versionJsonPlugin({
      distDir: 'metadata',
    });

    if (plugin.configResolved) {
      (plugin.configResolved as (this: any, config: ResolvedConfig) => void)
        .call({}, createMockConfig(TEST_DIR));
    }

    if (plugin.closeBundle) {
      (plugin.closeBundle as (this: any) => void).call({});
    }

    const expectedDir = join(TEST_DIR, 'metadata');
    expect(existsSync(expectedDir)).toBe(true);
    expect(existsSync(join(expectedDir, 'version.json'))).toBe(true);
  });

  it('should create output directory if it does not exist', () => {
    const testPackageJson = {
      name: 'test-app',
      version: '7.0.0',
    };
    writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(testPackageJson, null, 2), 'utf8');

    const nestedDir = join(TEST_DIR, 'nested', 'deep');
    const plugin = versionJsonPlugin({
      distDir: 'nested/deep',
    });

    if (plugin.configResolved) {
      (plugin.configResolved as (this: any, config: ResolvedConfig) => void)
        .call({}, createMockConfig(TEST_DIR));
    }

    if (plugin.closeBundle) {
      (plugin.closeBundle as (this: any) => void).call({});
    }

    expect(existsSync(nestedDir)).toBe(true);
    expect(existsSync(join(nestedDir, 'version.json'))).toBe(true);
  });

  it('should respect pretty option', () => {
    const testPackageJson = {
      name: 'test-app',
      version: '8.0.0',
    };
    writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(testPackageJson, null, 2), 'utf8');

    const plugin = versionJsonPlugin({
      pretty: false,
      fields: ['version'],
    });

    if (plugin.configResolved) {
      (plugin.configResolved as (this: any, config: ResolvedConfig) => void)
        .call({}, createMockConfig(TEST_DIR));
    }

    if (plugin.closeBundle) {
      (plugin.closeBundle as (this: any) => void).call({});
    }

    const versionJsonPath = join(TEST_DIR, 'version.json');
    const rawContent = readFileSync(versionJsonPath, 'utf8');

    // Non-pretty JSON should be on a single line
    expect(rawContent).not.toContain('\n');
    expect(rawContent).toBe('{"version":"8.0.0"}');
  });

  it('should throw error when package.json is missing', () => {
    // Remove package.json temporarily
    if (existsSync(PACKAGE_JSON_PATH)) {
      rmSync(PACKAGE_JSON_PATH, { force: true });
    }

    const plugin = versionJsonPlugin();

    if (plugin.configResolved) {
      (plugin.configResolved as (this: any, config: ResolvedConfig) => void)
        .call({}, createMockConfig(TEST_DIR));
    }

    expect(() => {
      if (plugin.closeBundle) {
        (plugin.closeBundle as (this: any) => void).call({});
      }
    }).toThrow(/package\.json not found/);
  });

  it('should throw error when version field is missing in package.json', () => {
    const testPackageJson = {
      name: 'test-app',
      // version field is missing
    };
    writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(testPackageJson, null, 2), 'utf8');

    const plugin = versionJsonPlugin();

    if (plugin.configResolved) {
      (plugin.configResolved as (this: any, config: ResolvedConfig) => void)
        .call({}, createMockConfig(TEST_DIR));
    }

    expect(() => {
      if (plugin.closeBundle) {
        (plugin.closeBundle as (this: any) => void).call({});
      }
    }).toThrow(/version field not found/);
  });

  it('should have correct plugin metadata', () => {
    const plugin = versionJsonPlugin();

    expect(plugin.name).toBe('vite-plugin-version-meta');
    expect(plugin.apply).toBe('build');
    expect(plugin.closeBundle).toBeDefined();
    expect(plugin.configResolved).toBeDefined();
  });
});
