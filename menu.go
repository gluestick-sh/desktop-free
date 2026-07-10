package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) glueRootDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".glue")
}

func (a *App) openGlueDataDir() {
	root := a.glueRootDir()
	if root == "" {
		return
	}
	_ = os.MkdirAll(root, 0755)

	if runtime.GOOS == "windows" {
		_ = exec.Command("explorer", root).Start()
		return
	}
	if a.ctx != nil {
		wailsruntime.BrowserOpenURL(a.ctx, "file://"+root)
	}
}
