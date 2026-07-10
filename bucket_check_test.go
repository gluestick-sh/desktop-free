package main

import (
	"testing"
	"time"
)

func TestBucketCheckRetryDelays(t *testing.T) {
	if bucketCheckMaxAttempts != 3 {
		t.Fatalf("bucketCheckMaxAttempts = %d, want 3", bucketCheckMaxAttempts)
	}
	if len(bucketCheckRetryDelays) != bucketCheckMaxAttempts-1 {
		t.Fatalf("retry delays len = %d, want %d", len(bucketCheckRetryDelays), bucketCheckMaxAttempts-1)
	}
	if bucketCheckRetryDelays[0] != 5*time.Second {
		t.Fatalf("first delay = %v, want 5s", bucketCheckRetryDelays[0])
	}
	if bucketCheckRetryDelays[1] != 10*time.Second {
		t.Fatalf("second delay = %v, want 10s", bucketCheckRetryDelays[1])
	}
}

func TestHasBucketUpdateTaskRunning(t *testing.T) {
	a := NewApp()
	if a.hasBucketUpdateTaskRunning() {
		t.Fatal("expected no update task on new app")
	}
	if !a.startBucketTask("update", "*") {
		t.Fatal("expected to start bulk update task")
	}
	if !a.hasBucketUpdateTaskRunning() {
		t.Fatal("expected update task running")
	}
	if !a.startBucketTask("add", "main") {
		t.Fatal("expected to start add task alongside update")
	}
	if !a.hasBucketUpdateTaskRunning() {
		t.Fatal("update task should still be running alongside add")
	}
	a.finishBucketTask("update", "*")
	if a.hasBucketUpdateTaskRunning() {
		t.Fatal("expected no update task after finish")
	}
}
