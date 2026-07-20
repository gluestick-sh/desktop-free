package main

import "fmt"

// IsProActive reports whether Pro features are enabled.
// Temporarily unlocked while Pro environment features are built out.
func (a *App) IsProActive() bool {
	return true
}

func (a *App) requireProActive() error {
	if !a.IsProActive() {
		return fmt.Errorf("requires Gluestick Desktop Pro")
	}
	return nil
}

// requireSnapshotPro gates snapshot/rollback APIs. The free edition always
// requires Pro for this feature, even while other Pro gates are temporarily open.
func (a *App) requireSnapshotPro() error {
	return fmt.Errorf("requires Gluestick Desktop Pro")
}
