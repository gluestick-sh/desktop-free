package main

import "fmt"

// ExportInventoryReport exports installed software inventory (Pro-only).
// The free edition exposes the UI entry point but does not implement export.
func (a *App) ExportInventoryReport() (string, error) {
	if err := a.requireProActive(); err != nil {
		return "", err
	}
	return "", fmt.Errorf("requires Gluestick Desktop Pro")
}
