package main

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/gluestick-sh/core/bucket"
	"github.com/gluestick-sh/core/config"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// bucketUpdatesCache holds the most recent per-bucket update-availability check.
type bucketUpdatesCache struct {
	at      time.Time
	updates map[string]bucketUpdateEntry
}

type bucketUpdateEntry struct {
	HasUpdates   bool
	LocalCommit  string
	RemoteCommit string
	CheckOK      bool
	CheckError   string
	CheckedAt    time.Time
}

// BucketInfo represents installed bucket information (exposed to frontend)
type BucketInfo struct {
	Name              string `json:"name"`
	RepoURL           string `json:"repoURL"`
	Description       string `json:"description,omitempty"`
	DescriptionCustom bool   `json:"descriptionCustom"`
	PackageCount      int    `json:"packageCount"`
	HasUpdates        bool   `json:"hasUpdates"`
	// UpdatesKnown is true when a valid check has been completed (success or failure), not a default placeholder value.
	UpdatesKnown  bool   `json:"updatesKnown"`
	CheckFailed   bool   `json:"checkFailed"`
	CheckError    string `json:"checkError,omitempty"`
	StatusStale   bool   `json:"statusStale"`
	LocalCommit   string `json:"localCommit"`
	RemoteCommit  string `json:"remoteCommit"`
	LastCheckedAt string `json:"lastCheckedAt,omitempty"`
}

// BucketUpdateStatus represents the update check result for a single bucket (returned by CheckBucketUpdates)
type BucketUpdateStatus struct {
	HasUpdates   bool   `json:"hasUpdates"`
	LocalCommit  string `json:"localCommit"`
	RemoteCommit string `json:"remoteCommit"`
	CheckOK      bool   `json:"checkOK"`
	CheckError   string `json:"checkError,omitempty"`
}

// KnownBucketInfo represents a known bucket directory entry
type KnownBucketInfo struct {
	Name      string `json:"name"`
	RepoURL   string `json:"repoURL"`
	Installed bool   `json:"installed"`
}

func (a *App) openBucketRegistry() (*bucket.Registry, error) {
	root := a.glueRootDir()
	if root == "" {
		return nil, fmt.Errorf("glue root directory unavailable")
	}
	registry, err := bucket.NewRegistry(root)
	if err != nil {
		return nil, err
	}
	if err := registry.EnsureGit(); err != nil {
		return nil, fmt.Errorf("git unavailable: %w", err)
	}
	if err := registry.ReloadFromDisk(); err != nil {
		return nil, err
	}
	return registry, nil
}

func bucketCheckIntervalFromConfig(rootDir string) time.Duration {
	minutes := config.DefaultBucketCheckIntervalMinutes
	if rootDir != "" {
		if n, ok, err := config.ReadConfigBucketCheckInterval(rootDir); err == nil && ok {
			minutes = n
		}
	}
	return time.Duration(minutes) * time.Minute
}

func (a *App) bucketCheckInterval() time.Duration {
	return bucketCheckIntervalFromConfig(a.glueRootDir())
}

func timeUntilNextBucketCheck(lastAt time.Time, interval time.Duration, now time.Time) time.Duration {
	if lastAt.IsZero() {
		return 0
	}
	remaining := interval - now.Sub(lastAt)
	if remaining <= 0 {
		return 0
	}
	return remaining
}

func (a *App) timeUntilNextScheduledBucketCheck() time.Duration {
	a.bucketUpdatesMu.Lock()
	lastAt := a.bucketUpdates.at
	a.bucketUpdatesMu.Unlock()
	return timeUntilNextBucketCheck(lastAt, a.bucketCheckInterval(), time.Now())
}

func (a *App) wakeBucketCheckScheduler() {
	if a.bucketCheckScheduleCh == nil {
		return
	}
	select {
	case a.bucketCheckScheduleCh <- struct{}{}:
	default:
	}
}

func (a *App) bucketUpdatesCacheStale() bool {
	a.bucketUpdatesMu.Lock()
	defer a.bucketUpdatesMu.Unlock()
	if a.bucketUpdates.at.IsZero() {
		return true
	}
	return time.Since(a.bucketUpdates.at) >= a.bucketCheckInterval()
}

func (a *App) bucketUpdatesCacheValid() bool {
	return !a.bucketUpdatesCacheStale()
}

func (a *App) snapshotBucketUpdates() (map[string]bucketUpdateEntry, time.Time) {
	a.bucketUpdatesMu.Lock()
	defer a.bucketUpdatesMu.Unlock()
	out := make(map[string]bucketUpdateEntry, len(a.bucketUpdates.updates))
	for name, entry := range a.bucketUpdates.updates {
		out[name] = entry
	}
	return out, a.bucketUpdates.at
}

func bucketInfoFrom(b *bucket.Bucket, localCommit string, entry bucketUpdateEntry, hasEntry, cacheStale bool, description string, descriptionCustom bool) BucketInfo {
	info := BucketInfo{
		Name:              b.Name,
		RepoURL:           b.RepoURL,
		Description:       description,
		DescriptionCustom: descriptionCustom,
		PackageCount:      -1,
		LocalCommit:       localCommit,
	}
	if !hasEntry {
		return info
	}
	info.UpdatesKnown = true
	info.StatusStale = cacheStale
	info.RemoteCommit = entry.RemoteCommit
	if !entry.CheckedAt.IsZero() {
		info.LastCheckedAt = entry.CheckedAt.UTC().Format(time.RFC3339)
	}
	if entry.CheckOK {
		info.HasUpdates = entry.HasUpdates
		return info
	}
	info.CheckFailed = true
	info.CheckError = entry.CheckError
	return info
}

func resolveBucketDescription(name string, customDescriptions map[string]string) (string, bool) {
	if desc, ok := customDescriptions[name]; ok && strings.TrimSpace(desc) != "" {
		return strings.TrimSpace(desc), true
	}
	return bucket.GetKnownBucketDescription(name), false
}

// SetBucketDescription saves or clears a user-defined bucket description in config.json.
func (a *App) SetBucketDescription(name, description string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return fmt.Errorf("bucket name is required")
	}
	registry, err := a.openBucketRegistry()
	if err != nil {
		return err
	}
	if _, err := registry.Get(name); err != nil {
		return fmt.Errorf("bucket %q is not installed", name)
	}
	return config.SetConfigBucketDescription(a.glueRootDir(), name, description)
}

func (a *App) storeBucketUpdates(updates map[string]bucketUpdateEntry) {
	now := time.Now()
	for name, entry := range updates {
		if entry.CheckedAt.IsZero() {
			entry.CheckedAt = now
		}
		updates[name] = entry
	}
	a.bucketUpdatesMu.Lock()
	a.bucketUpdates = bucketUpdatesCache{at: now, updates: updates}
	a.bucketUpdatesMu.Unlock()
}

func (a *App) mergeBucketUpdate(name string, entry bucketUpdateEntry) {
	a.bucketUpdatesMu.Lock()
	defer a.bucketUpdatesMu.Unlock()
	if a.bucketUpdates.updates == nil {
		a.bucketUpdates.updates = make(map[string]bucketUpdateEntry)
	}
	if entry.CheckedAt.IsZero() {
		entry.CheckedAt = time.Now()
	}
	a.bucketUpdates.updates[name] = entry
	// Partial check results should count toward stats before the full check finishes.
	a.bucketUpdates.at = time.Now()
}

// pendingBucketUpdatesFromCache counts buckets marked as having upstream updates in the local check cache.
func (a *App) pendingBucketUpdatesFromCache() int {
	a.bucketUpdatesMu.Lock()
	defer a.bucketUpdatesMu.Unlock()
	if a.bucketUpdates.at.IsZero() {
		return 0
	}
	pending := 0
	for _, entry := range a.bucketUpdates.updates {
		if entry.CheckOK && entry.HasUpdates {
			pending++
		}
	}
	return pending
}

func (a *App) touchBucketUpdatesCache() {
	a.bucketUpdatesMu.Lock()
	a.bucketUpdates.at = time.Now()
	a.bucketUpdatesMu.Unlock()
}

func (a *App) invalidateBucketUpdatesCache() {
	a.bucketUpdatesMu.Lock()
	a.bucketUpdates = bucketUpdatesCache{}
	a.bucketUpdatesMu.Unlock()
}

// markBucketsSynced marks specified buckets as "synced" (no updates) in cache,
// leaving other bucket states unchanged. names must be a non-empty list.
func (a *App) markBucketsSynced(registry *bucket.Registry, names []string) {
	if len(names) == 0 {
		return
	}
	now := time.Now()
	a.bucketUpdatesMu.Lock()
	defer a.bucketUpdatesMu.Unlock()

	if a.bucketUpdates.updates == nil {
		a.bucketUpdates.updates = make(map[string]bucketUpdateEntry)
	}
	for _, name := range names {
		entry := a.bucketUpdates.updates[name]
		entry.HasUpdates = false
		entry.CheckOK = true
		entry.CheckError = ""
		entry.CheckedAt = now
		if registry != nil {
			if local, err := registry.CurrentCommit(name); err == nil && local != "" {
				entry.LocalCommit = local
				entry.RemoteCommit = local
			} else if entry.RemoteCommit != "" {
				entry.LocalCommit = entry.RemoteCommit
			}
		} else if entry.RemoteCommit != "" {
			entry.LocalCommit = entry.RemoteCommit
		}
		a.bucketUpdates.updates[name] = entry
	}
	a.bucketUpdates.at = now
}

// ListBuckets lists installed buckets (reads local information only, no network update checks).
func (a *App) ListBuckets() ([]BucketInfo, error) {
	registry, err := a.openBucketRegistry()
	if err != nil {
		return nil, err
	}

	cached, _ := a.snapshotBucketUpdates()
	cacheStale := a.bucketUpdatesCacheStale()
	customDescriptions, _ := config.ReadConfigBucketDescriptions(a.glueRootDir())

	items := make([]BucketInfo, 0)
	bucketList := registry.List()
	for _, b := range bucketList {
		localCommit, _ := registry.CurrentCommit(b.Name)
		entry, hasEntry := cached[b.Name]
		desc, custom := resolveBucketDescription(b.Name, customDescriptions)
		items = append(items, bucketInfoFrom(b, localCommit, entry, hasEntry, cacheStale, desc, custom))
	}
	a.fillBucketPackageCounts(bucketList)
	return items, nil
}

func (a *App) fillBucketPackageCounts(buckets []*bucket.Bucket) {
	if err := a.requireEngine(); err != nil {
		return
	}
	counts := a.engine.PackageCountsByBucket()
	go func() {
		for _, b := range buckets {
			runtime.EventsEmit(a.ctx, "bucket:package-count", map[string]interface{}{
				"name":  b.Name,
				"count": counts[b.Name],
			})
		}
	}()
}

// CheckBucketUpdates checks over network whether each bucket has updates, results written to cache for ListBuckets to reuse.
// This operation is slow (one git fetch per bucket), called asynchronously by frontend after rendering the list.
func (a *App) CheckBucketUpdates() (map[string]BucketUpdateStatus, error) {
	registry, err := a.openBucketRegistry()
	if err != nil {
		return nil, err
	}

	statuses, err := registry.CheckUpdates()
	if err != nil {
		return nil, err
	}

	cache := make(map[string]bucketUpdateEntry, len(statuses))
	result := make(map[string]BucketUpdateStatus, len(statuses))
	for name, status := range statuses {
		entry := bucketUpdateEntry{
			HasUpdates:   status.HasUpdates,
			LocalCommit:  status.LocalCommit,
			RemoteCommit: status.RemoteCommit,
			CheckOK:      status.OK,
			CheckError:   status.ErrMsg,
		}
		cache[name] = entry
		result[name] = BucketUpdateStatus{
			HasUpdates:   status.HasUpdates,
			LocalCommit:  status.LocalCommit,
			RemoteCommit: status.RemoteCommit,
			CheckOK:      status.OK,
			CheckError:   status.ErrMsg,
		}
	}
	for _, b := range registry.List() {
		if _, ok := cache[b.Name]; ok {
			continue
		}
		localCommit, _ := registry.CurrentCommit(b.Name)
		cache[b.Name] = bucketUpdateEntry{
			LocalCommit: localCommit,
			CheckOK:     false,
			CheckError:  "check result not returned",
		}
		result[b.Name] = BucketUpdateStatus{
			LocalCommit: localCommit,
			CheckOK:     false,
			CheckError:  "check result not returned",
		}
	}

	a.storeBucketUpdates(cache)
	a.invalidateSlowStatsCache()
	return result, nil
}

// ListKnownBuckets lists known buckets that can be added
func (a *App) ListKnownBuckets() ([]KnownBucketInfo, error) {
	registry, err := a.openBucketRegistry()
	if err != nil {
		return nil, err
	}

	installed := make(map[string]struct{})
	for _, b := range registry.List() {
		installed[b.Name] = struct{}{}
	}

	known := bucket.KnownBuckets()
	names := make([]string, 0, len(known))
	for name := range known {
		names = append(names, name)
	}
	sort.Strings(names)

	items := make([]KnownBucketInfo, 0, len(names))
	for _, name := range names {
		_, ok := installed[name]
		items = append(items, KnownBucketInfo{
			Name:      name,
			RepoURL:   known[name],
			Installed: ok,
		})
	}
	return items, nil
}

// AddBucket adds a bucket in background (returns immediately; progress pushed via bucket:task:* events).
func (a *App) AddBucket(name, repoURL string) error {
	if err := a.requireEngine(); err != nil {
		return err
	}

	name = strings.TrimSpace(name)
	repoURL = strings.TrimSpace(repoURL)
	if name == "" {
		return fmt.Errorf("bucket name cannot be empty")
	}

	if repoURL == "" {
		var ok bool
		repoURL, ok = bucket.GetKnownBucketURL(name)
		if !ok {
			return fmt.Errorf("unknown bucket %q; provide a repository URL", name)
		}
	}

	if !a.startBucketTask("add", name) {
		return fmt.Errorf("bucket %q is already being added", name)
	}

	go a.runAddBucketTask(name, repoURL)
	return nil
}

// RemoveBucket removes a bucket in background (returns immediately; progress pushed via bucket:task:* events).
func (a *App) RemoveBucket(name string) error {
	if err := a.requireEngine(); err != nil {
		return err
	}

	name = strings.TrimSpace(name)
	if name == "" {
		return fmt.Errorf("bucket name cannot be empty")
	}

	if !a.startBucketTask("remove", name) {
		return fmt.Errorf("bucket %q is already being removed", name)
	}

	go a.runRemoveBucketTask(name)
	return nil
}

// resolveBucketUpdateTargets resolves the list of buckets to update.
// When names is non-empty, updates by specified names; when empty, only includes buckets with updates in cache (update check required first).
// If cache is invalid and no names specified, falls back to all buckets (for unchecked scenarios).
func (a *App) resolveBucketUpdateTargets(registry *bucket.Registry, names []string) []string {
	if len(names) > 0 {
		return names
	}
	if !a.bucketUpdatesCacheValid() {
		all := registry.List()
		targets := make([]string, 0, len(all))
		for _, b := range all {
			targets = append(targets, b.Name)
		}
		return targets
	}
	cached, _ := a.snapshotBucketUpdates()
	targets := make([]string, 0)
	for _, b := range registry.List() {
		entry, ok := cached[b.Name]
		if ok && entry.CheckOK && entry.HasUpdates {
			targets = append(targets, b.Name)
		}
	}
	return targets
}

// UpdateBuckets updates buckets in background (when names is empty, only updates buckets with available updates; progress pushed via bucket:task:* events).
func (a *App) UpdateBuckets(names []string) error {
	if err := a.requireEngine(); err != nil {
		return err
	}

	taskName := updateBucketTaskName(names)
	if !a.startBucketTask("update", taskName) {
		if taskName == "*" {
			return fmt.Errorf("a bulk bucket update is already in progress")
		}
		return fmt.Errorf("bucket %q is already being updated", taskName)
	}

	go a.runUpdateBucketsTask(names)
	return nil
}

func (a *App) reloadEngineBuckets(refreshExisting bool) {
	if a.engine != nil {
		a.engine.ReloadBuckets(refreshExisting)
	}
}

func (a *App) bucketStats() (count int, updates int, err error) {
	registry, err := a.openBucketRegistry()
	if err != nil {
		return 0, 0, err
	}
	buckets := registry.List()
	if !a.bucketUpdatesCacheValid() {
		return len(buckets), 0, nil
	}
	cached, _ := a.snapshotBucketUpdates()
	pending := 0
	for _, b := range buckets {
		entry, ok := cached[b.Name]
		if ok && entry.CheckOK && entry.HasUpdates {
			pending++
		}
	}
	return len(buckets), pending, nil
}

func bucketUpdateResultPayload(name string, entry bucketUpdateEntry) map[string]any {
	payload := map[string]interface{}{
		"name":         name,
		"hasUpdates":   entry.HasUpdates,
		"localCommit":  entry.LocalCommit,
		"remoteCommit": entry.RemoteCommit,
		"checkOK":      entry.CheckOK,
		"checkError":   entry.CheckError,
		"updatesKnown": true,
		"checkFailed":  !entry.CheckOK,
	}
	if !entry.CheckedAt.IsZero() {
		payload["lastCheckedAt"] = entry.CheckedAt.UTC().Format(time.RFC3339)
	}
	return payload
}
