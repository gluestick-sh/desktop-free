package main

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// PackageLaunchEntry is a discovered executable with launch classification.
type PackageLaunchEntry struct {
	Label    string `json:"label"`
	Path     string `json:"path"`
	RelPath  string `json:"relPath"`
	AutoKind string `json:"autoKind"`
	Kind     string `json:"kind"`
	UserSet  bool   `json:"userSet"`
	Openable bool   `json:"openable"`
}

// PackageLauncher is a runnable file for an installed package.
type PackageLauncher struct {
	Label string `json:"label"`
	Path  string `json:"path"`
	Kind  string `json:"kind,omitempty"`
}

// ListPackageLaunchMenu returns all discovered executables and effective launch kinds.
func (a *App) ListPackageLaunchMenu(name string) ([]PackageLaunchEntry, error) {
	if err := a.requireEngine(); err != nil {
		return nil, err
	}
	candidates, err := a.engine.ListLaunchCandidates(name)
	if err != nil {
		return nil, err
	}
	out := make([]PackageLaunchEntry, len(candidates))
	for i, c := range candidates {
		out[i] = PackageLaunchEntry{
			Label:    c.Label,
			Path:     c.Path,
			RelPath:  c.RelPath,
			AutoKind: c.AutoKind,
			Kind:     c.Kind,
			UserSet:  c.UserSet,
			Openable: c.Openable,
		}
	}
	return out, nil
}

// ListPackageLaunchers returns openable launch targets (not marked hidden).
func (a *App) ListPackageLaunchers(name string) ([]PackageLauncher, error) {
	if err := a.requireEngine(); err != nil {
		return nil, err
	}
	targets, err := a.engine.ListLaunchTargets(name)
	if err != nil {
		return nil, err
	}
	out := make([]PackageLauncher, len(targets))
	for i, t := range targets {
		out[i] = PackageLauncher{Label: t.Label, Path: t.Path, Kind: t.Kind}
	}
	return out, nil
}

// SetPackageLaunchKind saves user preference: gui, console, skip, or auto (clear override).
func (a *App) SetPackageLaunchKind(name, relPath, kind string) error {
	if err := a.requireEngine(); err != nil {
		return err
	}
	return a.engine.SetLaunchPreference(name, relPath, kind)
}

// SetPackageLaunchKinds saves multiple launch preferences in one atomic write.
// Each value is gui, console, skip, or auto (clear override).
func (a *App) SetPackageLaunchKinds(name string, updates map[string]string) error {
	if err := a.requireEngine(); err != nil {
		return err
	}
	return a.engine.SetLaunchPreferences(name, updates)
}

// OpenPackageLauncher opens a runnable file that belongs to the package.
func (a *App) OpenPackageLauncher(name, path string) error {
	if err := a.requireEngine(); err != nil {
		return err
	}
	return a.engine.OpenLaunchTarget(name, path)
}

// RemovePackageLaunchEntry removes a launcher from the open-program menu.
func (a *App) RemovePackageLaunchEntry(name, relPath string) error {
	if err := a.requireEngine(); err != nil {
		return err
	}
	return a.engine.RemoveLaunchEntry(name, relPath)
}

// PickAndAddPackageLaunchExecutable opens a file picker under the package install dir
// and restores the chosen executable to the launch menu.
// dialogTitle and filterLabel come from the frontend i18n layer.
func (a *App) PickAndAddPackageLaunchExecutable(name, dialogTitle, filterLabel string) (*PackageLaunchEntry, error) {
	if err := a.requireEngine(); err != nil {
		return nil, err
	}
	installDir, err := a.engine.PackageInstallDir(name)
	if err != nil {
		return nil, err
	}
	title := strings.TrimSpace(dialogTitle)
	if title == "" {
		title = "Select a program to open"
	}
	filter := strings.TrimSpace(filterLabel)
	if filter == "" {
		filter = "Executables (*.exe;*.bat;*.cmd;*.jar)"
	}
	absPath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:            title,
		DefaultDirectory: installDir,
		Filters: []runtime.FileFilter{
			{DisplayName: filter, Pattern: "*.exe;*.bat;*.cmd;*.jar"},
		},
	})
	if err != nil {
		return nil, err
	}
	if absPath == "" {
		return nil, nil
	}
	clean := filepath.Clean(absPath)
	rel, err := filepath.Rel(installDir, clean)
	if err != nil || strings.HasPrefix(rel, "..") {
		return nil, fmt.Errorf("selected file must be inside the package install directory")
	}
	rel = filepath.ToSlash(rel)
	if err := a.engine.AddLaunchEntry(name, rel, "gui"); err != nil {
		return nil, err
	}
	candidates, err := a.engine.ListLaunchCandidates(name)
	if err != nil {
		return nil, err
	}
	for _, c := range candidates {
		if strings.EqualFold(c.RelPath, rel) {
			return &PackageLaunchEntry{
				Label:    c.Label,
				Path:     c.Path,
				RelPath:  c.RelPath,
				AutoKind: c.AutoKind,
				Kind:     c.Kind,
				UserSet:  c.UserSet,
				Openable: c.Openable,
			}, nil
		}
	}
	return nil, fmt.Errorf("added launcher not found")
}
