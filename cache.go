package main

import "fmt"

// CachePackageInfo is one package in the cache index (exposed to the frontend).
type CachePackageInfo struct {
	Name      string `json:"name"`
	Version   string `json:"version"`
	Installed string `json:"installed"`
	Size      int64  `json:"size"`
	FileCount int    `json:"fileCount"`
}

// CacheSummary is aggregate cache index statistics.
type CacheSummary struct {
	PackageCount int   `json:"packageCount"`
	TotalSize    int64 `json:"totalSize"`
	TotalFiles   int   `json:"totalFiles"`
}

// CacheSpaceResult reports space reclaimed by a cache cleanup operation.
type CacheSpaceResult struct {
	RemovedBlobs int   `json:"removedBlobs"`
	FreedBytes   int64 `json:"freedBytes"`
}

// ListCachePackages lists packages recorded in the cache index.
func (a *App) ListCachePackages() ([]CachePackageInfo, error) {
	if err := a.requireEngine(); err != nil {
		return nil, err
	}
	src := a.engine.ListCachePackages()
	out := make([]CachePackageInfo, len(src))
	for i, p := range src {
		out[i] = CachePackageInfo{
			Name:      p.Name,
			Version:   p.Version,
			Installed: p.Installed,
			Size:      p.Size,
			FileCount: p.FileCount,
		}
	}
	return out, nil
}

// GetCacheSummary returns aggregate cache index statistics.
func (a *App) GetCacheSummary() (CacheSummary, error) {
	if err := a.requireEngine(); err != nil {
		return CacheSummary{}, err
	}
	s := a.engine.CacheSummary()
	return CacheSummary{
		PackageCount: s.PackageCount,
		TotalSize:    s.TotalSize,
		TotalFiles:   s.TotalFiles,
	}, nil
}

// PurgeCachePackage removes a package from the cache index and deletes unreferenced store blobs (returns immediately; progress via cache:task:* events).
func (a *App) PurgeCachePackage(name string) error {
	if err := a.requireEngine(); err != nil {
		return err
	}
	taskName := cachePurgeTaskName(name)
	if !a.startCacheTask(taskName) {
		return fmt.Errorf("a cache operation is already in progress")
	}
	go a.runCachePurgeTask(name)
	return nil
}

// RunCacheGC runs background GC for unreferenced store blobs (returns immediately; progress via cache:task:* events).
func (a *App) RunCacheGC() error {
	if err := a.requireEngine(); err != nil {
		return err
	}
	if !a.startCacheTask(cacheGCTaskName) {
		return fmt.Errorf("cache cleanup is already in progress")
	}
	go a.runCacheGCTask()
	return nil
}
