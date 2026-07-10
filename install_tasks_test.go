package main

import "testing"

func TestInstallTaskKey(t *testing.T) {
	if got := installTaskKey("main/vim"); got != "vim" {
		t.Fatalf("installTaskKey(main/vim) = %q, want vim", got)
	}
	if got := installTaskKey("vim@9.0"); got != "vim" {
		t.Fatalf("installTaskKey(vim@9.0) = %q, want vim", got)
	}
}
