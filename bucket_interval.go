package main

import (
	"github.com/gluestick-sh/core/config"
)

// BucketCheckIntervalConfig background bucket update-check interval exposed to the frontend.
type BucketCheckIntervalConfig struct {
	Minutes    int    `json:"minutes"`
	ConfigPath string `json:"configPath"`
	Options    []int  `json:"options"`
}

func bucketCheckIntervalMinutesFromConfig(root string) int {
	minutes := config.DefaultBucketCheckIntervalMinutes
	if root == "" {
		return minutes
	}
	if n, ok, err := config.ReadConfigBucketCheckInterval(root); err == nil && ok {
		minutes = n
	}
	return minutes
}

// GetBucketCheckInterval reads bucket_check_interval_minutes from config.json (default 15).
func (a *App) GetBucketCheckInterval() (*BucketCheckIntervalConfig, error) {
	root := a.glueRootDir()
	if root == "" {
		return nil, errGlueRootUnavailable()
	}
	return &BucketCheckIntervalConfig{
		Minutes:    bucketCheckIntervalMinutesFromConfig(root),
		ConfigPath: config.ConfigPath(root),
		Options:    append([]int(nil), config.AllowedBucketCheckIntervals...),
	}, nil
}

// SetBucketCheckInterval saves bucket_check_interval_minutes to config.json.
func (a *App) SetBucketCheckInterval(minutes int) error {
	root := a.glueRootDir()
	if root == "" {
		return errGlueRootUnavailable()
	}
	minutes = config.NormalizeBucketCheckInterval(minutes)
	if err := config.WriteConfigBucketCheckInterval(root, minutes); err != nil {
		return err
	}
	a.wakeBucketCheckScheduler()
	return nil
}
