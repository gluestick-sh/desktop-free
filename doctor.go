package main

import "fmt"

// DoctorCheck represents individual environment check item (exposed to frontend)
type DoctorCheck struct {
	ID        string `json:"id"`
	OK        bool   `json:"ok"`
	DetailKey string `json:"detailKey,omitempty"`
	Detail    string `json:"detail"`
	HintKey   string `json:"hintKey,omitempty"`
	Hint      string `json:"hint,omitempty"`
	// Deprecated: use ID.
	Name string `json:"name,omitempty"`
}

// DoctorReport represents environment diagnosis report
type DoctorReport struct {
	Checks []DoctorCheck `json:"checks"`
	OK     bool          `json:"ok"`
}

// RunDoctor checks Glue runtime environment in background (returns immediately; results pushed via doctor:* events item by item).
func (a *App) RunDoctor() error {
	if err := a.requireEngine(); err != nil {
		return err
	}
	if !a.tryStartDoctor() {
		return fmt.Errorf("environment diagnosis is already in progress")
	}
	go a.runDoctorTask()
	return nil
}
