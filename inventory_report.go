package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const inventoryReportVersion = "2"

type inventoryReport struct {
	ReportVersion string                 `json:"reportVersion"`
	GeneratedAt   string                 `json:"generatedAt"`
	Host          string                 `json:"host"`
	Application   inventoryAppInfo       `json:"application"`
	Summary       inventorySummary       `json:"summary"`
	Packages      []inventoryPackageItem `json:"packages"`
}

type inventoryAppInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	DataDir string `json:"dataDir"`
}

type inventorySummary struct {
	InstalledCount         int   `json:"installedCount"`
	TotalSizeBytes         int64 `json:"totalSizeBytes"`
	BucketCount            int   `json:"bucketCount"`
	BucketUpdatesCount     int   `json:"bucketUpdatesCount"`
	UpdatesCount           int   `json:"updatesCount"`
	AvailablePackagesCount int   `json:"availablePackagesCount"`
	VersionLockedCount     int   `json:"versionLockedCount"`
	MultiVersionCount      int   `json:"multiVersionCount"`
}

type inventoryVersionEntry struct {
	Version string `json:"version"`
	Active  bool   `json:"active"`
}

type inventoryPackageItem struct {
	Name             string                    `json:"name"`
	Version          string                    `json:"version"`
	ActiveVersion    string                    `json:"activeVersion"`
	VersionCount     int                       `json:"versionCount"`
	VersionLocked    bool                      `json:"versionLocked"`
	Versions         []inventoryVersionEntry   `json:"versions,omitempty"`
	Bucket           string                    `json:"bucket"`
	InstalledAt      string                    `json:"installedAt"`
	InstallSizeBytes int64                     `json:"installSizeBytes"`
	UpdateAvailable  bool                      `json:"updateAvailable"`
	LatestVersion    string                    `json:"latestVersion,omitempty"`
	Description      string                    `json:"description,omitempty"`
	Homepage         string                    `json:"homepage,omitempty"`
}

func (a *App) buildInventoryReport() (*inventoryReport, error) {
	if err := a.requireEngine(); err != nil {
		return nil, err
	}

	installed, err := a.listInstalledFromEngine(false)
	if err != nil {
		return nil, err
	}

	stats, err := a.GetStats(StatsQuery{ForceRefresh: false, HideDeprecated: false})
	if err != nil {
		return nil, err
	}

	host, _ := os.Hostname()
	about := a.GetAboutInfo()

	items := make([]inventoryPackageItem, 0, len(installed))
	var lockedCount, multiVersionCount int

	for _, pkg := range installed {
		item := inventoryPackageItem{
			Name:             pkg.Name,
			Version:          pkg.Version,
			ActiveVersion:    pkg.Version,
			VersionCount:     1,
			VersionLocked:    pkg.VersionLocked,
			Bucket:           pkg.Bucket,
			InstalledAt:      pkg.InstalledAt,
			InstallSizeBytes: pkg.InstallSize,
			UpdateAvailable:  pkg.UpdateAvailable,
			LatestVersion:    pkg.LatestVersion,
			Description:      pkg.Description,
			Homepage:         pkg.Homepage,
			Versions: []inventoryVersionEntry{
				{Version: pkg.Version, Active: true},
			},
		}

		if verInfo, err := a.engine.GetPackageVersions(pkg.Name); err == nil && verInfo != nil {
			item.ActiveVersion = verInfo.ActiveVersion
			item.Version = verInfo.ActiveVersion
			item.VersionLocked = verInfo.VersionLocked
			item.VersionCount = len(verInfo.Versions)
			item.Versions = make([]inventoryVersionEntry, len(verInfo.Versions))
			for i, v := range verInfo.Versions {
				item.Versions[i] = inventoryVersionEntry{
					Version: v.Version,
					Active:  v.Active,
				}
			}
		}

		if item.VersionLocked {
			lockedCount++
		}
		if item.VersionCount > 1 {
			multiVersionCount++
		}
		items = append(items, item)
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].Name < items[j].Name
	})

	return &inventoryReport{
		ReportVersion: inventoryReportVersion,
		GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
		Host:          host,
		Application: inventoryAppInfo{
			Name:    "Gluestick Desktop",
			Version: about.Version,
			DataDir: about.DataDir,
		},
		Summary: inventorySummary{
			InstalledCount:         intFromStats(stats, "installedCount"),
			TotalSizeBytes:         int64FromStats(stats, "totalSize"),
			BucketCount:            intFromStats(stats, "bucketCount"),
			BucketUpdatesCount:     intFromStats(stats, "bucketUpdatesCount"),
			UpdatesCount:           intFromStats(stats, "updatesCount"),
			AvailablePackagesCount: intFromStats(stats, "availablePackagesCount"),
			VersionLockedCount:     lockedCount,
			MultiVersionCount:      multiVersionCount,
		},
		Packages: items,
	}, nil
}

func formatInventoryVersions(versions []inventoryVersionEntry) string {
	if len(versions) == 0 {
		return ""
	}
	parts := make([]string, len(versions))
	for i, v := range versions {
		if v.Active {
			parts[i] = v.Version + " (active)"
		} else {
			parts[i] = v.Version
		}
	}
	return strings.Join(parts, "; ")
}

func intFromStats(stats map[string]interface{}, key string) int {
	switch v := stats[key].(type) {
	case int:
		return v
	case int64:
		return int(v)
	case float64:
		return int(v)
	default:
		return 0
	}
}

func int64FromStats(stats map[string]interface{}, key string) int64 {
	switch v := stats[key].(type) {
	case int:
		return int64(v)
	case int64:
		return v
	case float64:
		return int64(v)
	default:
		return 0
	}
}

func inventoryReportToCSV(report *inventoryReport) ([]byte, error) {
	var buf strings.Builder
	w := csv.NewWriter(&buf)

	_ = w.Write([]string{"# reportVersion", report.ReportVersion})
	_ = w.Write([]string{"# generatedAt", report.GeneratedAt})
	_ = w.Write([]string{"# host", report.Host})
	_ = w.Write([]string{"# application", report.Application.Name, report.Application.Version})
	_ = w.Write([]string{"# dataDir", report.Application.DataDir})
	_ = w.Write([]string{
		"# summary",
		fmt.Sprintf("installed=%d", report.Summary.InstalledCount),
		fmt.Sprintf("totalSizeBytes=%d", report.Summary.TotalSizeBytes),
		fmt.Sprintf("buckets=%d", report.Summary.BucketCount),
		fmt.Sprintf("updates=%d", report.Summary.UpdatesCount),
		fmt.Sprintf("versionLocked=%d", report.Summary.VersionLockedCount),
		fmt.Sprintf("multiVersion=%d", report.Summary.MultiVersionCount),
	})
	_ = w.Write(nil)

	_ = w.Write([]string{
		"name",
		"activeVersion",
		"versionLocked",
		"versionCount",
		"installedVersions",
		"bucket",
		"installedAt",
		"installSizeBytes",
		"updateAvailable",
		"latestVersion",
		"homepage",
		"description",
	})
	for _, pkg := range report.Packages {
		_ = w.Write([]string{
			pkg.Name,
			pkg.ActiveVersion,
			fmt.Sprintf("%t", pkg.VersionLocked),
			fmt.Sprintf("%d", pkg.VersionCount),
			formatInventoryVersions(pkg.Versions),
			pkg.Bucket,
			pkg.InstalledAt,
			fmt.Sprintf("%d", pkg.InstallSizeBytes),
			fmt.Sprintf("%t", pkg.UpdateAvailable),
			pkg.LatestVersion,
			pkg.Homepage,
			pkg.Description,
		})
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return nil, err
	}
	return []byte(buf.String()), nil
}

// ExportInventoryReport exports installed software inventory (JSON report or CSV table). Returns save path; returns empty string when user cancels.
// dialogTitle, jsonFilterLabel, and csvFilterLabel come from the frontend i18n layer.
func (a *App) ExportInventoryReport(dialogTitle, jsonFilterLabel, csvFilterLabel string) (string, error) {
	if err := a.requireProActive(); err != nil {
		return "", err
	}
	if a.ctx == nil {
		return "", fmt.Errorf("application not ready")
	}

	report, err := a.buildInventoryReport()
	if err != nil {
		return "", err
	}

	title := strings.TrimSpace(dialogTitle)
	if title == "" {
		title = "Export software inventory"
	}
	jsonFilter := strings.TrimSpace(jsonFilterLabel)
	if jsonFilter == "" {
		jsonFilter = "JSON report (*.json)"
	}
	csvFilter := strings.TrimSpace(csvFilterLabel)
	if csvFilter == "" {
		csvFilter = "CSV table (*.csv)"
	}

	defaultName := fmt.Sprintf("gluestick-inventory-%s.json", time.Now().Format("20060102-150405"))
	savePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           title,
		DefaultFilename: defaultName,
		Filters: []runtime.FileFilter{
			{DisplayName: jsonFilter, Pattern: "*.json"},
			{DisplayName: csvFilter, Pattern: "*.csv"},
		},
	})
	if err != nil {
		return "", err
	}
	if savePath == "" {
		return "", nil
	}

	var data []byte
	ext := strings.ToLower(filepath.Ext(savePath))
	switch ext {
	case ".csv":
		data, err = inventoryReportToCSV(report)
	default:
		data, err = json.MarshalIndent(report, "", "  ")
	}
	if err != nil {
		return "", err
	}

	if err := os.WriteFile(savePath, data, 0644); err != nil {
		return "", fmt.Errorf("write report: %w", err)
	}
	return savePath, nil
}
