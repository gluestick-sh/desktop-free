package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// ExportTemplateDefinitions saves template definition JSON. Returns empty string when user cancels.
// dialogTitle and filterLabel come from the frontend i18n layer.
func (a *App) ExportTemplateDefinitions(jsonContent, dialogTitle, filterLabel string) (string, error) {
	if err := a.requireProActive(); err != nil {
		return "", err
	}
	if a.ctx == nil {
		return "", fmt.Errorf("application not ready")
	}
	content := strings.TrimSpace(jsonContent)
	if content == "" {
		return "", fmt.Errorf("template content is empty")
	}

	title := strings.TrimSpace(dialogTitle)
	if title == "" {
		title = "Export template definitions"
	}
	filter := strings.TrimSpace(filterLabel)
	if filter == "" {
		filter = "Template definition JSON (*.json)"
	}

	defaultName := fmt.Sprintf("gluestick-official-recipes-%s.json", time.Now().Format("20060102-150405"))
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

	ext := strings.ToLower(filepath.Ext(savePath))
	if ext != ".json" {
		savePath += ".json"
	}

	if err := os.WriteFile(savePath, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("write template definitions: %w", err)
	}
	return savePath, nil
}

// ImportTemplateDefinitions opens a JSON file picker and returns the file contents. Empty string when cancelled.
// dialogTitle and filterLabel come from the frontend i18n layer.
func (a *App) ImportTemplateDefinitions(dialogTitle, filterLabel string) (string, error) {
	if err := a.requireProActive(); err != nil {
		return "", err
	}
	if a.ctx == nil {
		return "", fmt.Errorf("application not ready")
	}

	title := strings.TrimSpace(dialogTitle)
	if title == "" {
		title = "Import template definitions"
	}
	filter := strings.TrimSpace(filterLabel)
	if filter == "" {
		filter = "Template definition JSON (*.json)"
	}

	openPath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: title,
		Filters: []runtime.FileFilter{
			{DisplayName: filter, Pattern: "*.json"},
		},
	})
	if err != nil {
		return "", err
	}
	if openPath == "" {
		return "", nil
	}

	data, err := os.ReadFile(openPath)
	if err != nil {
		return "", fmt.Errorf("read template definitions: %w", err)
	}
	return string(data), nil
}
