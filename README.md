# Gluestick Desktop (Free)

Gluestick Desktop is the GUI for the [Glue](https://github.com/gluestick-sh/core) package manager, built with [Wails](https://wails.io/).

This repository is the **free open-source edition** (MIT license). Pro environment features are being built out; the upgrade dialog reflects the planned Pro value proposition, and existing Pro gates are temporarily unlocked for development.

## Tech stack

- **Backend**: Go + Wails v2
- **Frontend**: React + TypeScript + Vite
- **Engine**: in-process import of `github.com/gluestick-sh/core/engine`

## Features

- Browse packages in buckets
- Search by package name / description
- Single-package install / uninstall
- Live progress display
- Installed package list and version viewing
- Activity log
- Environment template browsing and single-package install
- Dark / light themes
- Multiple UI languages

## Prerequisites

1. Go 1.26+
2. Node.js 18+
3. Wails CLI

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

## Development and build

Run all commands from the repository root (module `gluestick.sh/desktop`, depends on [`github.com/gluestick-sh/core`](https://github.com/gluestick-sh/core)).

### Install frontend dependencies

```powershell
cd frontend
npm install
cd ..
```

### Dev mode (recommended)

For day-to-day development, use **`dev.ps1`** instead of running `wails dev` directly.

On **Windows ARM64 + Go 1.26**, `wails dev` appends `-gcflags "all=-N -l"`, which can trigger `syscall.Syscall15: nosplit stack over 792 byte limit` and cause a **failed Go backend build / blank window**. `wails build` does not have this issue, so production binaries are fine.

```powershell
.\dev.ps1
```

### Production build

```powershell
.\build.ps1
```

Output: `build/bin/gluestick.exe` (on Windows, defaults to the current machine architecture).

Regenerate Wails bindings after changing exported Go methods (e.g. in `app.go`):

```powershell
wails generate module
```

## Layout

```
├── dev.ps1              # Dev mode entry (recommended)
├── main.go              # Wails entry
├── app.go               # Go app logic, engine API bindings
├── app_config.go        # Feature gate helpers
├── wails.json           # Wails config
└── frontend/
    └── src/
        ├── App.tsx      # Main UI
        └── ...
```

## Engine integration

The GUI receives live progress via `engine.NewCallbackReporter`. The frontend listens to Wails events such as `install:progress` to update the UI.

## License

MIT — see [LICENSE](LICENSE).
