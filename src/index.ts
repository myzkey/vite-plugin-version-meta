import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

export interface VersionJsonPluginOptions {
  /**
   * Output file name (inside outDir or distDir)
   * @default "version.json"
   */
  fileName?: string;

  /**
   * Output directory.
   * - If specified: resolved as `${outDir}/${distDir}`
   * - If not specified: use Vite's `build.outDir` as-is
   * @default undefined
   */
  distDir?: string;

  /**
   * Fields to include in the output JSON
   * @default ["version", "revision", "builtAt"]
   */
  fields?: Array<'version' | 'revision' | 'builtAt'>;

  /**
   * Fallback value when revision information is unavailable
   * @default "unknown"
   */
  fallbackRevision?: string;

  /**
   * Pretty-print JSON
   * @default true
   */
  pretty?: boolean;
}

interface VersionData {
  version?: string;
  revision?: string;
  builtAt?: string;
}

/**
 * Safely executes a command and returns the result, or fallback on error
 */
function safeExec(command: string, fallback: string): string {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch {
    return fallback;
  }
}

/**
 * Reads the version from package.json
 */
function getPackageVersion(): string {
  const packageJsonPath = join(process.cwd(), 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error('package.json not found in the current directory');
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  if (!packageJson.version) {
    throw new Error('version field not found in package.json');
  }

  return packageJson.version;
}

/**
 * Gets the current source revision (currently Git commit hash)
 */
function getRevision(fallback: string): string {
  return safeExec('git rev-parse --short HEAD', fallback);
}

/**
 * Gets the current build timestamp in ISO8601 format
 */
function getBuiltAt(): string {
  return new Date().toISOString();
}

/**
 * Vite plugin that generates version.json with build metadata
 */
export function versionJsonPlugin(options: VersionJsonPluginOptions = {}): Plugin {
  const {
    fileName = 'version.json',
    fields = ['version', 'revision', 'builtAt'],
    fallbackRevision = 'unknown',
    pretty = true,
    distDir,
  } = options;

  let resolvedOutDir: string;

  return {
    name: 'vite-plugin-version-meta',
    apply: 'build',

    configResolved(config) {
      const baseOutDir = config.build.outDir || 'dist';
      resolvedOutDir = distDir ? join(baseOutDir, distDir) : baseOutDir;
    },

    closeBundle() {
      try {
        const data: VersionData = {};

        if (fields.includes('version')) {
          data.version = getPackageVersion();
        }

        if (fields.includes('revision')) {
          data.revision = getRevision(fallbackRevision);
        }

        if (fields.includes('builtAt')) {
          data.builtAt = getBuiltAt();
        }

        if (!existsSync(resolvedOutDir)) {
          mkdirSync(resolvedOutDir, { recursive: true });
        }

        const outputPath = join(resolvedOutDir, fileName);
        const json = JSON.stringify(data, null, pretty ? 2 : 0);

        writeFileSync(outputPath, json, 'utf8');
        console.log(`✓ Generated ${fileName} at ${outputPath}`);
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`vite-plugin-version-meta: ${error.message}`);
        }
        throw error;
      }
    },
  };
}

export default versionJsonPlugin;
