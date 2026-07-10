package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestEnsureGlueShim_fromBundledCopy(t *testing.T) {
	tmp := t.TempDir()
	appDir := filepath.Join(tmp, "app")
	glueRoot := filepath.Join(tmp, ".glue")
	if err := os.MkdirAll(appDir, 0o755); err != nil {
		t.Fatal(err)
	}
	bundled := filepath.Join(appDir, "shim.exe")
	if err := os.WriteFile(bundled, []byte("shim-stub"), 0o755); err != nil {
		t.Fatal(err)
	}

	orig := osExecutable
	osExecutable = func() (string, error) {
		return filepath.Join(appDir, "gluestick.exe"), nil
	}
	t.Cleanup(func() { osExecutable = orig })

	if err := ensureGlueShim(glueRoot); err != nil {
		t.Fatalf("ensureGlueShim: %v", err)
	}
	dest := filepath.Join(glueRoot, "shim.exe")
	data, err := os.ReadFile(dest)
	if err != nil {
		t.Fatalf("read dest: %v", err)
	}
	if string(data) != "shim-stub" {
		t.Fatalf("dest content = %q, want shim-stub", data)
	}

	// Idempotent when already present.
	if err := os.WriteFile(dest, []byte("existing"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := ensureGlueShim(glueRoot); err != nil {
		t.Fatalf("second ensureGlueShim: %v", err)
	}
	data, err = os.ReadFile(dest)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "existing" {
		t.Fatalf("dest overwritten: %q", data)
	}
}

func TestEnsureGlueShim_missingBundled(t *testing.T) {
	glueRoot := filepath.Join(t.TempDir(), ".glue")
	orig := osExecutable
	osExecutable = func() (string, error) {
		return filepath.Join(t.TempDir(), "gluestick.exe"), nil
	}
	t.Cleanup(func() { osExecutable = orig })

	if err := ensureGlueShim(glueRoot); err == nil {
		t.Fatal("expected error when bundled shim missing")
	}
}
