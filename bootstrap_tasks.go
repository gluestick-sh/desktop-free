package main

import (
	"context"
	"fmt"
	stdruntime "runtime"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/gluestick-sh/core/message"
)

func (a *App) startBootstrapTask(tool string) bool {
	a.bootstrapTasksMu.Lock()
	defer a.bootstrapTasksMu.Unlock()
	if a.bootstrapTasks == nil {
		a.bootstrapTasks = make(map[string]struct{})
	}
	if _, ok := a.bootstrapTasks[tool]; ok {
		return false
	}
	a.bootstrapTasks[tool] = struct{}{}
	return true
}

func (a *App) finishBootstrapTask(tool string) {
	a.bootstrapTasksMu.Lock()
	delete(a.bootstrapTasks, tool)
	a.bootstrapTasksMu.Unlock()
}

func (a *App) emitBootstrapTaskStart(tool string) {
	runtime.EventsEmit(a.ctx, "bootstrap:task:start", map[string]interface{}{
		"tool": tool,
	})
}

func (a *App) emitBootstrapTaskProgress(tool, phase, messageKey string, messageArgs map[string]interface{}, percent float64) {
	if messageArgs == nil {
		messageArgs = map[string]interface{}{}
	}
	runtime.EventsEmit(a.ctx, "bootstrap:task:progress", map[string]interface{}{
		"tool":        tool,
		"phase":       phase,
		"message":     message.FormatEN(messageKey, messageArgs),
		"messageKey":  messageKey,
		"messageArgs": messageArgs,
		"percentage":  percent,
	})
}

func (a *App) emitBootstrapTaskComplete(tool string) {
	runtime.EventsEmit(a.ctx, "bootstrap:task:complete", map[string]interface{}{
		"tool": tool,
	})
}

func (a *App) emitBootstrapTaskError(tool, errMsg string) {
	runtime.EventsEmit(a.ctx, "bootstrap:task:error", map[string]interface{}{
		"tool":  tool,
		"error": errMsg,
	})
}

type bootstrapStep struct {
	tool         string
	resolve      func() (string, error)
	needed       func() bool
	ensure       func(context.Context) (string, error)
	detectKey    string
	discoverKey  string
	downloadKey  string
	extractKey   string
	completeKey  string
}

func (a *App) tryStartBootstrapSequence() bool {
	a.bootstrapSeqMu.Lock()
	defer a.bootstrapSeqMu.Unlock()
	if a.bootstrapSeqRunning {
		return false
	}
	a.bootstrapSeqRunning = true
	return true
}

func (a *App) finishBootstrapSequence() {
	a.bootstrapSeqMu.Lock()
	a.bootstrapSeqRunning = false
	a.bootstrapSeqMu.Unlock()
}

func (a *App) runStartupBootstrapTasks() {
	if stdruntime.GOOS != "windows" {
		return
	}
	if !a.tryStartBootstrapSequence() {
		return
	}
	go func() {
		defer a.finishBootstrapSequence()
		a.runStartupBootstrapSequence()
	}()
}

func (a *App) runStartupBootstrapSequence() {
	if err := a.requireEngine(); err != nil {
		return
	}

	steps := []bootstrapStep{
		{
			tool:        "seven_zip",
			resolve:     a.engine.ResolveBootstrappedSevenZipPath,
			needed:      func() bool { return true },
			ensure: func(ctx context.Context) (string, error) { return a.engine.EnsureSevenZipBootstrap(ctx) },
			detectKey:   message.BootstrapSevenZipDetecting,
			downloadKey: message.BootstrapSevenZipDownloading,
			extractKey:  message.BootstrapSevenZipExtracting,
			completeKey: message.BootstrapSevenZipComplete,
		},
		{
			tool:        "git",
			resolve:     a.engine.ResolveBootstrappedGitPath,
			needed:      func() bool { return true },
			ensure: func(ctx context.Context) (string, error) { return a.engine.EnsureGitBootstrap(ctx) },
			detectKey:   message.BootstrapGitDetecting,
			downloadKey: message.BootstrapGitDownloading,
			extractKey:  message.BootstrapGitExtracting,
			completeKey: message.BootstrapGitComplete,
		},
		{
			tool:        "wix",
			resolve:     a.engine.ResolveBootstrappedDarkPath,
			needed:      a.engine.CatalogNeedsDark,
			ensure: func(ctx context.Context) (string, error) { return a.engine.EnsureDarkBootstrap(ctx) },
			detectKey:   message.BootstrapWixDetecting,
			discoverKey: message.BootstrapWixDiscovering,
			downloadKey: message.BootstrapWixDownloading,
			extractKey:  message.BootstrapWixExtracting,
			completeKey: message.BootstrapWixComplete,
		},
		{
			tool:        "innounp",
			resolve:     a.engine.ResolveBootstrappedInnounpPath,
			needed:      a.engine.CatalogNeedsInnounp,
			ensure: func(ctx context.Context) (string, error) { return a.engine.EnsureInnounpBootstrap(ctx) },
			detectKey:   message.BootstrapInnounpDetecting,
			discoverKey: message.BootstrapInnounpDiscovering,
			downloadKey: message.BootstrapInnounpDownloading,
			extractKey:  message.BootstrapInnounpExtracting,
			completeKey: message.BootstrapInnounpComplete,
		},
	}

	for _, step := range steps {
		a.runBootstrapStep(step)
	}
}

func (a *App) runBootstrapStep(step bootstrapStep) {
	if step.needed != nil && !step.needed() {
		runtime.LogInfo(a.ctx, fmt.Sprintf("bootstrap %s: not needed, skipping", step.tool))
		return
	}

	if path, err := step.resolve(); err == nil {
		runtime.LogInfo(a.ctx, fmt.Sprintf("bootstrap %s: already available at %s", step.tool, path))
		return
	}

	if !a.startBootstrapTask(step.tool) {
		return
	}
	defer a.finishBootstrapTask(step.tool)

	a.emitBootstrapTaskStart(step.tool)
	// Keep percentage at 0 until ensure() finishes so the bar stays indeterminate.
	// Fixed mid-values looked "stuck" because download/extract emit no byte progress.
	if step.detectKey != "" {
		a.emitBootstrapTaskProgress(step.tool, "detect", step.detectKey, nil, 0)
	}
	if step.discoverKey != "" {
		a.emitBootstrapTaskProgress(step.tool, "discover", step.discoverKey, nil, 0)
	}
	a.emitBootstrapTaskProgress(step.tool, "download", step.downloadKey, nil, 0)

	path, err := step.ensure(a.ctx)
	if err != nil {
		a.emitBootstrapTaskError(step.tool, err.Error())
		runtime.LogError(a.ctx, fmt.Sprintf("bootstrap %s failed: %v", step.tool, err))
		return
	}

	a.emitBootstrapTaskProgress(step.tool, "extract", step.extractKey, nil, 0)
	a.emitBootstrapTaskProgress(step.tool, "complete", step.completeKey, map[string]interface{}{
		"path": path,
	}, 100)
	a.emitBootstrapTaskComplete(step.tool)
	runtime.LogInfo(a.ctx, fmt.Sprintf("bootstrap %s ready at %s", step.tool, path))
}
