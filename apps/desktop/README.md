# Omnia Desktop Application

Electron wrapper for the Omnia Management System web application.

## Architecture

- **Electron Main Process**: `electron/main.ts` - Application lifecycle and window management
- **Preload Script**: `electron/preload.ts` - Secure IPC bridge with context isolation
- **Window Manager**: `electron/window-manager.ts` - Window creation and management
- **IPC Handlers**: `electron/ipc-handlers.ts` - Backend API for renderer process
- **Utilities**: `electron/utils/` - Logger, paths, environment helpers

## Development

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Next.js web app running on port 3000

### Running in Development Mode

From the project root:

```bash
# Start the desktop app (also starts Next.js dev server)
pnpm dev:desktop
```

This will:
1. Start Next.js dev server on http://localhost:3000
2. Wait for the server to be ready
3. Launch Electron with hot reload

### Building for Production

```bash
# Build the entire application
pnpm build:desktop

# This will:
# 1. Build Next.js with static export
# 2. Compile TypeScript
# 3. Package with electron-builder
# 4. Create installer in apps/desktop/release/
```

## Security

- **Context Isolation**: Enabled - Renderer and main processes are isolated
- **Node Integration**: Disabled - No direct Node.js access from renderer
- **Sandbox**: Enabled - Renderer runs in sandboxed environment
- **Web Security**: Enabled - Same-origin policy enforced
- **Preload Script**: Only whitelisted APIs exposed to renderer

## IPC API

The following APIs are exposed to the renderer process via `window.electron`:

### System Information
- `getAppVersion()` - Get application version
- `getPlatform()` - Get operating system platform
- `getUserDataPath()` - Get user data directory path

### File Operations
- `readFile(filePath)` - Read file contents
- `writeFile(filePath, content)` - Write file contents

### Dialog Operations
- `showOpenDialog(options)` - Show file open dialog
- `showSaveDialog(options)` - Show file save dialog
- `showMessageBox(options)` - Show message box

## Project Structure

```
apps/desktop/
├── electron/           # Main process code
│   ├── main.ts        # Entry point
│   ├── preload.ts     # IPC bridge
│   ├── window-manager.ts
│   ├── ipc-handlers.ts
│   └── utils/
│       ├── environment.ts
│       ├── logger.ts
│       └── paths.ts
├── types/             # TypeScript definitions
├── resources/         # Application resources (icons, etc.)
├── dist/              # Compiled output (gitignored)
└── release/           # Build artifacts (gitignored)
```

## Build Configuration

The application is configured to build for Windows with NSIS installer:

- **Output**: `release/Omnia Management-Setup-{version}.exe`
- **Installer Type**: NSIS with custom install directory option
- **Resources**: Static Next.js build embedded in `resources/web`

## Troubleshooting

### Port 3000 Already in Use
```bash
# Kill the process using port 3000
npx kill-port 3000
```

### Electron Won't Start
- Ensure Next.js dev server is running
- Check logs in: `%APPDATA%/omnia-management/logs/main.log`

### Build Fails
- Ensure Next.js build completed successfully
- Check that `apps/web/out` directory exists

## Environment Variables

- `ELECTRON_DEV_URL`: Override development server URL (default: http://localhost:3000)

## Logs

Application logs are stored in:
- **Windows**: `%APPDATA%\omnia-management\logs\main.log`
- **macOS**: `~/Library/Logs/omnia-management/main.log`
- **Linux**: `~/.config/omnia-management/logs/main.log`
