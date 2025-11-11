# vite-plugin-version-meta

A Vite plugin that automatically generates `version.json` with build metadata during the build process.

## Features

- Automatically extracts version from `package.json`
- Captures revision information (Git commit hash by default)
- Records build timestamp in ISO8601 format
- Configurable output file name and directory
- Selective field output (version, revision, builtAt)
- Safe fallback when Git is unavailable
- Integrates with Vite's build output directory
- Zero external dependencies
- TypeScript support with full type definitions

## Installation

```bash
npm install vite-plugin-version-meta --save-dev
```

Or with pnpm:

```bash
pnpm add -D vite-plugin-version-meta
```

Or with yarn:

```bash
yarn add -D vite-plugin-version-meta
```

## Usage

### Basic Setup

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { versionJsonPlugin } from 'vite-plugin-version-meta';

export default defineConfig({
  plugins: [
    react(),
    versionJsonPlugin(),
  ],
});
```

After running `vite build`, a `version.json` file will be generated in your build output directory:

```json
{
  "version": "1.2.3",
  "revision": "a1b2c3d",
  "builtAt": "2025-11-12T07:00:00.000Z"
}
```

### Advanced Configuration

```typescript
versionJsonPlugin({
  fileName: 'meta.json',
  distDir: 'metadata',  // Creates ${outDir}/metadata/meta.json
  fields: ['version', 'revision', 'builtAt'],
  fallbackRevision: 'unknown',
  pretty: true,
})
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fileName` | `string` | `"version.json"` | Name of the output file |
| `distDir` | `string` | `undefined` | Subdirectory within Vite's outDir (if not specified, uses outDir directly) |
| `fields` | `string[]` | `["version", "revision", "builtAt"]` | Fields to include in the output |
| `fallbackRevision` | `string` | `"unknown"` | Fallback value when revision is unavailable |
| `pretty` | `boolean` | `true` | Pretty-print JSON output |

### Available Fields

- `version` - Version from `package.json`
- `revision` - Source revision identifier (Git commit hash)
- `builtAt` - Build timestamp in ISO8601 format

## Use Cases

### Detecting New Deployments

Check if a new version is available and prompt users to reload:

```typescript
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    const checkVersion = async () => {
      const response = await fetch('/version.json');
      const data = await response.json();

      const currentRevision = localStorage.getItem('appRevision');

      if (currentRevision && currentRevision !== data.revision) {
        if (confirm('A new version is available. Reload to update?')) {
          localStorage.setItem('appRevision', data.revision);
          window.location.reload();
        }
      } else {
        localStorage.setItem('appRevision', data.revision);
      }
    };

    checkVersion();
    // Check every 5 minutes
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return <div>Your App</div>;
}
```

### Displaying Version Information

Show version info in your app's footer or about page:

```typescript
import { useEffect, useState } from 'react';

function Footer() {
  const [versionInfo, setVersionInfo] = useState(null);

  useEffect(() => {
    fetch('/version.json')
      .then(r => r.json())
      .then(setVersionInfo);
  }, []);

  if (!versionInfo) return null;

  return (
    <footer>
      Version {versionInfo.version} ({versionInfo.revision})
      <br />
      Built: {new Date(versionInfo.builtAt).toLocaleString()}
    </footer>
  );
}
```

## Error Handling

The plugin handles various error scenarios gracefully:

- **Git unavailable**: Uses `fallbackRevision` value (default: `"unknown"`)
- **Missing package.json**: Throws an error with clear message
- **Missing version field**: Throws an error with clear message
- **Output directory missing**: Automatically creates the directory

## Security

- Zero external dependencies - no supply chain risk
- No user input processing - purely static operations
- Fixed command execution - no command injection vulnerability
- Restricted file output - only writes to specified output directory

## CI/CD Compatibility

Works seamlessly with popular CI/CD platforms:

- GitHub Actions
- GitLab CI
- CircleCI
- Jenkins
- Vercel
- Netlify
- Cloudflare Pages

When Git is not available in the CI environment, the plugin will gracefully fall back to the configured `fallbackRevision` value.

## Requirements

- Vite 4.0.0 or higher
- Node.js 18.0.0 or higher

## License

MIT License - see [LICENSE](./LICENSE) for details

## Author

myzkey ([@myzkey](https://github.com/myzkey))

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

