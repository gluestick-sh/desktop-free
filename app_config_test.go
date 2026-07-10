package main

import "testing"

func TestFreeEditionProAlwaysInactive(t *testing.T) {
	app := NewApp()
	if app.IsProActive() {
		t.Fatal("expected IsProActive false in free edition")
	}
}

func TestExportInventoryRequiresPro(t *testing.T) {
	app := NewApp()
	_, err := app.ExportInventoryReport()
	if err == nil {
		t.Fatal("expected export to require pro in free edition")
	}
}

func TestSwitchPackageVersionRequiresPro(t *testing.T) {
	app := NewApp()
	if err := app.SwitchPackageVersion("vim", "1.0.0"); err == nil {
		t.Fatal("expected SwitchPackageVersion to require pro in free edition")
	}
}

func TestClearActivityLogRequiresPro(t *testing.T) {
	app := NewApp()
	if err := app.ClearActivityLog(); err == nil {
		t.Fatal("expected ClearActivityLog to require pro in free edition")
	}
}

func TestClearActivityLogByTimeRangeRequiresPro(t *testing.T) {
	app := NewApp()
	_, err := app.ClearActivityLogByTimeRange("today")
	if err == nil {
		t.Fatal("expected ClearActivityLogByTimeRange to require pro in free edition")
	}
}
