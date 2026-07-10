package main

import "fmt"

// ExportTemplateDefinitions saves template definition JSON (Pro-only).
func (a *App) ExportTemplateDefinitions(jsonContent string) (string, error) {
	if err := a.requireProActive(); err != nil {
		return "", err
	}
	return "", fmt.Errorf("requires Gluestick Desktop Pro")
}

// ImportTemplateDefinitions opens a JSON file picker (Pro-only).
func (a *App) ImportTemplateDefinitions() (string, error) {
	if err := a.requireProActive(); err != nil {
		return "", err
	}
	return "", fmt.Errorf("requires Gluestick Desktop Pro")
}
