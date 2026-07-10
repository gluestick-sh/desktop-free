package main

import (
	"fmt"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/gluestick-sh/core/engine"
)

func (a *App) tryStartUninstall(name string) bool {
	a.uninstallMu.Lock()
	defer a.uninstallMu.Unlock()
	if a.uninstallActive {
		return false
	}
	a.uninstallActive = true
	a.uninstallName = name
	return true
}

func (a *App) finishUninstall() {
	a.uninstallMu.Lock()
	a.uninstallActive = false
	a.uninstallName = ""
	a.uninstallMu.Unlock()
}

func (a *App) runUninstallTask(name string) {
	defer a.finishUninstall()

	reporter := engine.NewCallbackReporter(func(ev engine.ProgressEvent) {
		progress := InstallProgress{
			Phase:       string(ev.Phase),
			Status:      string(ev.Status),
			Percentage:  ev.Percentage,
			Message:     ev.Message,
			MessageKey:  ev.MessageKey,
			MessageArgs: ev.MessageArgs,
		}
		runtime.EventsEmit(a.ctx, "uninstall:progress", progress)
	})

	runtime.EventsEmit(a.ctx, "uninstall:start", name)

	uninstallStart := time.Now()
	result, err := a.engine.Uninstall(a.ctx, &engine.UninstallRequest{
		Request: engine.Request{Name: name},
	}, reporter)
	logPostOpDuration(a.ctx, fmt.Sprintf("engine.Uninstall(%s) completed", name), uninstallStart)

	if err != nil {
		runtime.EventsEmit(a.ctx, "uninstall:error", map[string]string{
			"name":  name,
			"error": err.Error(),
		})
		return
	}
	if opErr := resultError(result); opErr != nil {
		runtime.EventsEmit(a.ctx, "uninstall:error", map[string]string{
			"name":  name,
			"error": opErr.Error(),
		})
		return
	}

	runtime.EventsEmit(a.ctx, "uninstall:complete", name)
}
