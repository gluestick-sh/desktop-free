package main

import (
	"testing"
	"time"
)

func TestPendingBucketUpdatesFromCache(t *testing.T) {
	a := NewApp()
	if got := a.pendingBucketUpdatesFromCache(); got != 0 {
		t.Fatalf("empty cache pending = %d, want 0", got)
	}

	now := time.Now()
	a.bucketUpdates = bucketUpdatesCache{
		at: now,
		updates: map[string]bucketUpdateEntry{
			"main":    {HasUpdates: true, CheckOK: true},
			"extras":  {HasUpdates: false, CheckOK: true},
			"versions": {HasUpdates: true, CheckOK: false},
		},
	}
	if got := a.pendingBucketUpdatesFromCache(); got != 1 {
		t.Fatalf("pending = %d, want 1", got)
	}

	a.markBucketsSynced(nil, []string{"main"})
	if got := a.pendingBucketUpdatesFromCache(); got != 0 {
		t.Fatalf("pending after sync = %d, want 0", got)
	}
}

func TestMergeBucketUpdateTouchesCacheTime(t *testing.T) {
	a := NewApp()
	a.mergeBucketUpdate("main", bucketUpdateEntry{HasUpdates: true, CheckOK: true})
	a.bucketUpdatesMu.Lock()
	stale := a.bucketUpdates.at.IsZero()
	a.bucketUpdatesMu.Unlock()
	if stale {
		t.Fatal("expected mergeBucketUpdate to mark cache timestamp")
	}
}
