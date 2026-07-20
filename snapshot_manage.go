package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gluestick-sh/core/engine"
	"github.com/gluestick-sh/core/snapshot"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const snapshotsDirName = "snapshots"

// SnapshotSummary is a list-row view of a local snapshot file.
type SnapshotSummary struct {
	ID            string `json:"id"`
	CreatedAt     string `json:"createdAt"`
	Source        string `json:"source"`
	Notes         string `json:"notes"`
	DeviceID      string `json:"deviceId"`
	DisplayLabel  string `json:"displayLabel"`
	PackageCount  int    `json:"packageCount"`
	BucketCount   int    `json:"bucketCount"`
	Path          string `json:"path"`
}

// SnapshotPlanDTO is the dry-run / apply plan exposed to the frontend.
type SnapshotPlanDTO struct {
	BucketsToAdd       []snapshot.Bucket       `json:"bucketsToAdd"`
	PackagesToInstall  []snapshot.Package      `json:"packagesToInstall"`
	PackagesToActivate []snapshot.Package      `json:"packagesToActivate"`
	ConfigChanges      []snapshot.ConfigChange `json:"configChanges"`
	Empty              bool                    `json:"empty"`
}

var (
	snapshotApplyMu   sync.Mutex
	snapshotApplyBusy bool
)

func (a *App) snapshotsDir() (string, error) {
	root := a.glueRootDir()
	if root == "" {
		return "", fmt.Errorf("glue root directory unavailable")
	}
	dir := filepath.Join(root, snapshotsDirName)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("create snapshots directory: %w", err)
	}
	return dir, nil
}

func (a *App) snapshotPath(id string) (string, error) {
	id = strings.TrimSpace(id)
	if id == "" || strings.ContainsAny(id, `/\`) {
		return "", fmt.Errorf("invalid snapshot id")
	}
	dir, err := a.snapshotsDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, id+".json"), nil
}

func planToDTO(plan *snapshot.Plan) *SnapshotPlanDTO {
	if plan == nil {
		return &SnapshotPlanDTO{Empty: true}
	}
	return &SnapshotPlanDTO{
		BucketsToAdd:       plan.BucketsToAdd,
		PackagesToInstall:  plan.PackagesToInstall,
		PackagesToActivate: plan.PackagesToActivate,
		ConfigChanges:      plan.ConfigChanges,
		Empty:              plan.Empty(),
	}
}

func summaryFromSnapshot(path string, snap *snapshot.Snapshot) SnapshotSummary {
	label := strings.TrimSpace(snap.Device.DisplayName)
	if label == "" {
		label = strings.TrimSpace(snap.Device.Hostname)
	}
	if label == "" {
		label = snap.Device.DeviceID
	}
	return SnapshotSummary{
		ID:           snap.ID,
		CreatedAt:    snap.CreatedAt,
		Source:       snap.Source,
		Notes:        snap.Notes,
		DeviceID:     snap.Device.DeviceID,
		DisplayLabel: label,
		PackageCount: len(snap.Core.Packages),
		BucketCount:  len(snap.Core.Buckets),
		Path:         path,
	}
}

// ListLocalSnapshots returns snapshots stored under ~/.glue/snapshots/.
func (a *App) ListLocalSnapshots() ([]SnapshotSummary, error) {
	if err := a.requireSnapshotPro(); err != nil {
		return nil, err
	}
	dir, err := a.snapshotsDir()
	if err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	out := make([]SnapshotSummary, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".json") {
			continue
		}
		path := filepath.Join(dir, entry.Name())
		snap, err := snapshot.ReadFile(path)
		if err != nil {
			continue
		}
		out = append(out, summaryFromSnapshot(path, snap))
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt > out[j].CreatedAt
	})
	return out, nil
}

// CreateLocalSnapshot exports the current environment into ~/.glue/snapshots/.
func (a *App) CreateLocalSnapshot(notes string) (*SnapshotSummary, error) {
	if err := a.requireSnapshotPro(); err != nil {
		return nil, err
	}
	if err := a.requireEngine(); err != nil {
		return nil, err
	}
	snap, err := a.engine.ExportCoreSnapshot(snapshot.Meta{
		Source: snapshot.SourceManual,
		Notes:  notes,
	})
	if err != nil {
		return nil, err
	}
	path, err := a.snapshotPath(snap.ID)
	if err != nil {
		return nil, err
	}
	if err := snapshot.WriteFile(path, snap); err != nil {
		return nil, err
	}
	sum := summaryFromSnapshot(path, snap)
	return &sum, nil
}

// DeleteLocalSnapshot removes a snapshot file from ~/.glue/snapshots/.
func (a *App) DeleteLocalSnapshot(id string) error {
	if err := a.requireSnapshotPro(); err != nil {
		return err
	}
	path, err := a.snapshotPath(id)
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// ExportLocalSnapshot copies a stored snapshot to a user-chosen path.
func (a *App) ExportLocalSnapshot(id, dialogTitle, filterLabel string) (string, error) {
	if err := a.requireSnapshotPro(); err != nil {
		return "", err
	}
	if a.ctx == nil {
		return "", fmt.Errorf("application not ready")
	}
	src, err := a.snapshotPath(id)
	if err != nil {
		return "", err
	}
	snap, err := snapshot.ReadFile(src)
	if err != nil {
		return "", err
	}
	title := strings.TrimSpace(dialogTitle)
	if title == "" {
		title = "Export environment snapshot"
	}
	filter := strings.TrimSpace(filterLabel)
	if filter == "" {
		filter = "Environment snapshot (*.json)"
	}
	defaultName := fmt.Sprintf("gluestick-snapshot-%s.json", time.Now().Format("20060102-150405"))
	savePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           title,
		DefaultFilename: defaultName,
		Filters: []runtime.FileFilter{
			{DisplayName: filter, Pattern: "*.json"},
		},
	})
	if err != nil {
		return "", err
	}
	if savePath == "" {
		return "", nil
	}
	if strings.ToLower(filepath.Ext(savePath)) != ".json" {
		savePath += ".json"
	}
	if err := snapshot.WriteFile(savePath, snap); err != nil {
		return "", err
	}
	return savePath, nil
}

// PreviewLocalSnapshot returns an install-missing dry-run plan for a stored snapshot.
func (a *App) PreviewLocalSnapshot(id string) (*SnapshotPlanDTO, error) {
	if err := a.requireSnapshotPro(); err != nil {
		return nil, err
	}
	if err := a.requireEngine(); err != nil {
		return nil, err
	}
	path, err := a.snapshotPath(id)
	if err != nil {
		return nil, err
	}
	snap, err := snapshot.ReadFile(path)
	if err != nil {
		return nil, err
	}
	plan, err := a.engine.DiffCoreSnapshot(snap, snapshot.ApplyOptions{
		Mode:   snapshot.ApplyModeInstallMissing,
		DryRun: true,
	})
	if err != nil {
		return nil, err
	}
	return planToDTO(plan), nil
}

// ImportSnapshotFromFile opens a file picker, optionally stores a copy locally,
// and returns a dry-run plan. Pass apply=true to apply install-missing after import.
func (a *App) ImportSnapshotFromFile(dialogTitle, filterLabel string, apply bool) (*SnapshotPlanDTO, error) {
	if err := a.requireSnapshotPro(); err != nil {
		return nil, err
	}
	if err := a.requireEngine(); err != nil {
		return nil, err
	}
	if a.ctx == nil {
		return nil, fmt.Errorf("application not ready")
	}
	title := strings.TrimSpace(dialogTitle)
	if title == "" {
		title = "Import environment snapshot"
	}
	filter := strings.TrimSpace(filterLabel)
	if filter == "" {
		filter = "Environment snapshot (*.json)"
	}
	openPath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: title,
		Filters: []runtime.FileFilter{
			{DisplayName: filter, Pattern: "*.json"},
		},
	})
	if err != nil {
		return nil, err
	}
	if openPath == "" {
		return nil, nil
	}
	snap, err := snapshot.ReadFile(openPath)
	if err != nil {
		return nil, err
	}
	// Keep a local copy for restore history.
	localPath, err := a.snapshotPath(snap.ID)
	if err == nil {
		_ = snapshot.WriteFile(localPath, snap)
	}

	if !apply {
		plan, err := a.engine.DiffCoreSnapshot(snap, snapshot.ApplyOptions{
			Mode: snapshot.ApplyModeInstallMissing,
		})
		if err != nil {
			return nil, err
		}
		return planToDTO(plan), nil
	}
	return a.applySnapshotAsync(snap)
}

// ApplyLocalSnapshot applies a stored snapshot (install-missing) in the background.
// Returns the dry-run plan immediately; completion is signaled via snapshot:apply:* events.
func (a *App) ApplyLocalSnapshot(id string) (*SnapshotPlanDTO, error) {
	if err := a.requireSnapshotPro(); err != nil {
		return nil, err
	}
	if err := a.requireEngine(); err != nil {
		return nil, err
	}
	path, err := a.snapshotPath(id)
	if err != nil {
		return nil, err
	}
	snap, err := snapshot.ReadFile(path)
	if err != nil {
		return nil, err
	}
	return a.applySnapshotAsync(snap)
}

func (a *App) applySnapshotAsync(snap *snapshot.Snapshot) (*SnapshotPlanDTO, error) {
	plan, err := a.engine.DiffCoreSnapshot(snap, snapshot.ApplyOptions{
		Mode: snapshot.ApplyModeInstallMissing,
	})
	if err != nil {
		return nil, err
	}
	dto := planToDTO(plan)
	if plan.Empty() {
		return dto, nil
	}

	snapshotApplyMu.Lock()
	if snapshotApplyBusy {
		snapshotApplyMu.Unlock()
		return nil, fmt.Errorf("a snapshot apply is already in progress")
	}
	snapshotApplyBusy = true
	snapshotApplyMu.Unlock()

	go func() {
		defer func() {
			snapshotApplyMu.Lock()
			snapshotApplyBusy = false
			snapshotApplyMu.Unlock()
		}()

		if a.ctx != nil {
			runtime.EventsEmit(a.ctx, "snapshot:apply:start", map[string]any{
				"id":           snap.ID,
				"packageCount": len(plan.PackagesToInstall),
				"bucketCount":  len(plan.BucketsToAdd),
			})
		}

		reporter := engine.NewCallbackReporter(func(ev engine.ProgressEvent) {
			if a.ctx == nil {
				return
			}
			runtime.EventsEmit(a.ctx, "snapshot:apply:progress", map[string]any{
				"id":      snap.ID,
				"phase":   string(ev.Phase),
				"name":    ev.Package,
				"message": ev.Message,
				"percent": ev.Percentage,
			})
		})

		_, applyErr := a.engine.ApplyCoreSnapshot(context.Background(), snap, snapshot.ApplyOptions{
			Mode:   snapshot.ApplyModeInstallMissing,
			DryRun: false,
		}, reporter)

		if a.ctx == nil {
			return
		}
		if applyErr != nil {
			runtime.EventsEmit(a.ctx, "snapshot:apply:error", map[string]any{
				"id":    snap.ID,
				"error": applyErr.Error(),
			})
			return
		}
		a.emitActivityLogUpdated()
		a.invalidateSlowStatsCache()
		runtime.EventsEmit(a.ctx, "snapshot:apply:complete", map[string]any{
			"id": snap.ID,
		})
	}()

	return dto, nil
}
