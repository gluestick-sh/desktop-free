package main

import (
	"testing"
	"time"
)

func TestTimeUntilNextBucketCheck(t *testing.T) {
	now := time.Date(2026, 6, 9, 12, 0, 0, 0, time.UTC)
	interval := 5 * time.Minute

	if got := timeUntilNextBucketCheck(time.Time{}, interval, now); got != 0 {
		t.Fatalf("zero lastAt = %v, want 0", got)
	}

	lastAt := now.Add(-3 * time.Minute)
	if got := timeUntilNextBucketCheck(lastAt, interval, now); got != 2*time.Minute {
		t.Fatalf("3 min ago = %v, want 2m", got)
	}

	lastAt = now.Add(-10 * time.Minute)
	if got := timeUntilNextBucketCheck(lastAt, interval, now); got != 0 {
		t.Fatalf("10 min ago = %v, want 0", got)
	}
}
