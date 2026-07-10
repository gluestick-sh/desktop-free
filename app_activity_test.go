package main

import "testing"

func TestMapActivityRecord_doctorSuccess(t *testing.T) {
	entry := mapActivityRecord(map[string]interface{}{
		"id":           int64(1),
		"operation":    "doctor",
		"package_name": "6 checks passed",
		"status":       "success",
		"timestamp":    "2026-06-06T12:00:00+08:00",
		"details": map[string]interface{}{
			"passed": float64(6),
			"total":  float64(6),
			"ok":     true,
		},
	})
	if entry.Operation != "doctor" {
		t.Fatalf("operation = %q", entry.Operation)
	}
	if entry.PackageName != "6 checks passed" {
		t.Fatalf("packageName = %q", entry.PackageName)
	}
	if entry.Status != "success" {
		t.Fatalf("status = %q", entry.Status)
	}
	if entry.Details == nil {
		t.Fatal("details = nil")
	}
}

func TestMapActivityRecord_doctorSuccessFallbackName(t *testing.T) {
	entry := mapActivityRecord(map[string]interface{}{
		"operation": "doctor",
		"status":    "success",
		"timestamp": "2026-06-06T12:00:00+08:00",
		"details": map[string]interface{}{
			"passed": float64(6),
			"total":  float64(6),
			"ok":     true,
		},
	})
	if entry.PackageName != "" {
		t.Fatalf("packageName = %q, want empty", entry.PackageName)
	}
	if entry.Details["passed"] != float64(6) {
		t.Fatalf("details.passed = %v", entry.Details["passed"])
	}
}

func TestMapActivityRecord_bucketUpdate(t *testing.T) {
	entry := mapActivityRecord(map[string]interface{}{
		"operation":    "bucket_update",
		"package_name": "main",
		"status":       "success",
		"timestamp":    "2026-06-06T12:00:00+08:00",
	})
	if entry.Operation != "bucket_update" {
		t.Fatalf("operation = %q", entry.Operation)
	}
	if entry.PackageName != "main" {
		t.Fatalf("packageName = %q", entry.PackageName)
	}
	if entry.Status != "success" {
		t.Fatalf("status = %q", entry.Status)
	}
}

func TestMapActivityRecord_bucketAddRemove(t *testing.T) {
	add := mapActivityRecord(map[string]interface{}{
		"operation":    "bucket_add",
		"package_name": "extras",
		"status":       "success",
		"timestamp":    "2026-06-06T12:00:00+08:00",
	})
	if add.Operation != "bucket_add" || add.PackageName != "extras" {
		t.Fatalf("add entry = %+v", add)
	}

	remove := mapActivityRecord(map[string]interface{}{
		"operation":    "bucket_remove",
		"package_name": "old",
		"status":       "failed",
		"timestamp":    "2026-06-06T12:00:00+08:00",
		"details": map[string]interface{}{
			"error": "not found",
		},
	})
	if remove.Operation != "bucket_remove" || remove.Status != "failed" || remove.ErrorDetail != "not found" {
		t.Fatalf("remove entry = %+v", remove)
	}
}

func TestMapActivityRecord_versionSwitch(t *testing.T) {
	entry := mapActivityRecord(map[string]interface{}{
		"operation":    "version_switch",
		"package_name": "git",
		"version":      "2.45.0",
		"status":       "success",
		"timestamp":    "2026-06-06T12:00:00+08:00",
		"details": map[string]interface{}{
			"from": "2.44.0",
			"to":   "2.45.0",
		},
	})
	if entry.Operation != "version_switch" {
		t.Fatalf("operation = %q", entry.Operation)
	}
	if entry.PackageName != "git" {
		t.Fatalf("packageName = %q", entry.PackageName)
	}
	if entry.Version != "2.45.0" {
		t.Fatalf("version = %q", entry.Version)
	}
	if entry.Details["from"] != "2.44.0" {
		t.Fatalf("details.from = %v", entry.Details["from"])
	}
}
