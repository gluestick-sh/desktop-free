package main

import "testing"

func TestProFeaturesLockedInFree(t *testing.T) {
	app := NewApp()
	if app.IsProActive() {
		t.Fatal("expected IsProActive false in free edition")
	}
}

func TestExportInventoryRequiresProInFree(t *testing.T) {
	app := NewApp()
	_, err := app.ExportInventoryReport("Export", "JSON", "CSV")
	if err == nil || err.Error() != "requires Gluestick Desktop Pro" {
		t.Fatalf("expected Pro gate in free edition, got %v", err)
	}
}

func TestSwitchPackageVersionGateOpen(t *testing.T) {
	app := NewApp()
	err := app.SwitchPackageVersion("vim", "1.0.0")
	if err == nil {
		t.Fatal("expected error without engine")
	}
	if err.Error() == "requires Gluestick Desktop Pro" {
		t.Fatal("version switch should not be Pro-gated; expected engine error instead")
	}
}

func TestSetPackageVersionLockGateOpen(t *testing.T) {
	app := NewApp()
	err := app.SetPackageVersionLock("vim", true)
	if err == nil {
		t.Fatal("expected error without engine")
	}
	if err.Error() == "requires Gluestick Desktop Pro" {
		t.Fatal("version lock should not be Pro-gated; expected engine error instead")
	}
}

func TestClearActivityLogByTimeRangeGateOpen(t *testing.T) {
	app := NewApp()
	_, err := app.ClearActivityLogByTimeRange("all")
	if err == nil {
		t.Fatal("expected error without engine")
	}
	if err.Error() == "requires Gluestick Desktop Pro" {
		t.Fatal("clear history should not be Pro-gated; expected engine error instead")
	}
}
