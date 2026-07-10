package main

import (
	"github.com/gluestick-sh/core/downloader"
	"github.com/gluestick-sh/core/config"
)

// DownloadWorkersConfig parallel download worker settings exposed to the frontend.
type DownloadWorkersConfig struct {
	Workers    int    `json:"workers"`
	ConfigPath string `json:"configPath"`
	MinWorkers int    `json:"minWorkers"`
	MaxWorkers int    `json:"maxWorkers"`
	Step       int    `json:"step"`
}

func downloadWorkersFromConfig(root string) int {
	workers := downloader.DefaultWorkers
	if root == "" {
		return workers
	}
	if n, ok, err := config.ReadConfigDownloadWorkers(root); err == nil && ok {
		workers = downloader.NormalizeUserWorkers(n)
	}
	return workers
}

// GetDownloadWorkers reads download_workers from config.json (default 4).
func (a *App) GetDownloadWorkers() (*DownloadWorkersConfig, error) {
	root := a.glueRootDir()
	if root == "" {
		return nil, errGlueRootUnavailable()
	}
	return &DownloadWorkersConfig{
		Workers:    downloadWorkersFromConfig(root),
		ConfigPath: config.ConfigPath(root),
		MinWorkers: downloader.MinUserWorkers,
		MaxWorkers: downloader.MaxUserWorkers,
		Step:       downloader.UserWorkersStep,
	}, nil
}

// SetDownloadWorkers saves download_workers to config.json and applies it to the engine.
func (a *App) SetDownloadWorkers(workers int) error {
	root := a.glueRootDir()
	if root == "" {
		return errGlueRootUnavailable()
	}
	workers = downloader.NormalizeUserWorkers(workers)
	if err := config.WriteConfigDownloadWorkers(root, workers); err != nil {
		return err
	}
	a.mu.Lock()
	eng := a.engine
	a.mu.Unlock()
	if eng != nil {
		eng.SetWorkers(workers)
	}
	return nil
}
