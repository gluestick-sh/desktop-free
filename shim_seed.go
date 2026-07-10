package main

import (
	"fmt"
	"os"
	"path/filepath"
)

var osExecutable = os.Executable

// ensureGlueShim seeds ~/.glue/shim.exe from a bundled copy beside this executable.
// Desktop standalone installs ship gluestick.exe + shim.exe together; core uses the
// runner when creating per-command shims. Without it, installs fall back to .bat
// shims that invoke shim-run (CLI-only).
func ensureGlueShim(glueRoot string) error {
	if glueRoot == "" {
		return fmt.Errorf("empty glue root")
	}
	dest := filepath.Join(glueRoot, "shim.exe")
	if _, err := os.Stat(dest); err == nil {
		return nil
	}
	src := bundledShimPath()
	if src == "" {
		execPath, _ := osExecutable()
		return fmt.Errorf("bundled shim.exe not found beside %s", filepath.Base(execPath))
	}
	if err := os.MkdirAll(glueRoot, 0o755); err != nil {
		return fmt.Errorf("create glue root: %w", err)
	}
	data, err := os.ReadFile(src)
	if err != nil {
		return fmt.Errorf("read bundled shim: %w", err)
	}
	if err := os.WriteFile(dest, data, 0o755); err != nil {
		return fmt.Errorf("write %s: %w", dest, err)
	}
	return nil
}

func bundledShimPath() string {
	execPath, err := osExecutable()
	if err != nil {
		return ""
	}
	execDir := filepath.Dir(execPath)
	if resolved, err := filepath.EvalSymlinks(execDir); err == nil {
		execDir = resolved
	}
	candidate := filepath.Join(execDir, "shim.exe")
	if _, err := os.Stat(candidate); err != nil {
		return ""
	}
	return candidate
}
