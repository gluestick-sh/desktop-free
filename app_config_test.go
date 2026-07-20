package main

import "testing"

func TestProFeaturesUnlocked(t *testing.T) {
	app := NewApp()
	if !app.IsProActive() {
		t.Fatal("expected IsProActive true while Pro features are unlocked for development")
	}
}

func TestExportInventoryGateOpen(t *testing.T) {
	app := NewApp()
	if !app.IsProActive() {
		t.Fatal("expected Pro gate open")
	}
	// Without app context / engine this still errors; ensure it is not the Pro gate.
	_, err := app.ExportInventoryReport("Export", "JSON", "CSV")
	if err != nil && err.Error() == "requires Gluestick Desktop Pro" {
		t.Fatal("Pro gate should be open")
	}
}

func TestSwitchPackageVersionGateOpen(t *testing.T) {
	app := NewApp()
	err := app.SwitchPackageVersion("vim", "1.0.0")
	if err == nil {
		t.Fatal("expected error without engine")
	}
	if err.Error() == "requires Gluestick Desktop Pro" {
		t.Fatal("Pro gate should be open; expected engine error instead")
	}
}

func TestSetPackageVersionLockGateOpen(t *testing.T) {
	app := NewApp()
	err := app.SetPackageVersionLock("vim", true)
	if err == nil {
		t.Fatal("expected error without engine")
	}
	if err.Error() == "requires Gluestick Desktop Pro" {
		t.Fatal("Pro gate should be open; expected engine error instead")
	}
}

func TestClearActivityLogAllowedWhenProActive(t *testing.T) {
	app := NewApp()
	err := app.ClearActivityLog()
	if err == nil {
		t.Fatal("expected error without engine")
	}
	if err.Error() == "requires Gluestick Desktop Pro" {
		t.Fatal("Pro gate should be open; expected engine error instead")
	}
}

func TestListLocalSnapshotsRequiresProInFree(t *testing.T) {
	app := NewApp()
	_, err := app.ListLocalSnapshots()
	if err == nil || err.Error() != "requires Gluestick Desktop Pro" {
		t.Fatalf("expected snapshot Pro gate in free edition, got %v", err)
	}
}

func TestCreateLocalSnapshotRequiresProInFree(t *testing.T) {
	app := NewApp()
	_, err := app.CreateLocalSnapshot("notes")
	if err == nil || err.Error() != "requires Gluestick Desktop Pro" {
		t.Fatalf("expected snapshot Pro gate in free edition, got %v", err)
	}
}
