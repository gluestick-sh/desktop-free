package main

import "fmt"

// IsProActive reports whether Pro features are enabled.
// The free edition always returns false.
func (a *App) IsProActive() bool {
	return false
}

func (a *App) requireProActive() error {
	if !a.IsProActive() {
		return fmt.Errorf("requires Gluestick Desktop Pro")
	}
	return nil
}
