package main

import (
	"testing"
)

func TestCompareSemver(t *testing.T) {
	tests := []struct {
		a, b string
		want int
	}{
		{"0.1.4", "0.1.5", -1},
		{"0.1.5", "0.1.4", 1},
		{"0.1.4", "0.1.4", 0},
		{"v0.2.0", "0.1.9", 1},
		{"1.0.0", "0.9.9", 1},
	}
	for _, tc := range tests {
		got := compareSemver(tc.a, tc.b)
		if got != tc.want {
			t.Fatalf("compareSemver(%q, %q) = %d, want %d", tc.a, tc.b, got, tc.want)
		}
	}
}

func TestNormalizeVersion(t *testing.T) {
	if got := normalizeVersion("v0.1.4-beta"); got != "0.1.4" {
		t.Fatalf("normalizeVersion = %q", got)
	}
}

func TestPickDesktopInstallerAsset(t *testing.T) {
	assets := []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
	}{
		{Name: "GluestickDesktopSetup-amd64.exe", BrowserDownloadURL: "https://example.com/amd64.exe"},
		{Name: "GluestickDesktopSetup-arm64.exe", BrowserDownloadURL: "https://example.com/arm64.exe"},
	}
	if got := pickDesktopInstallerAsset(assets, "amd64"); got != "https://example.com/amd64.exe" {
		t.Fatalf("pickDesktopInstallerAsset amd64 = %q", got)
	}
	if got := pickDesktopInstallerAsset(assets, "arm64"); got != "https://example.com/arm64.exe" {
		t.Fatalf("pickDesktopInstallerAsset arm64 = %q", got)
	}
}
