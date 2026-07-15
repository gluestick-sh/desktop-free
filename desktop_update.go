package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	goruntime "runtime"
	"strconv"
	"strings"
	"time"

	"github.com/gluestick-sh/core/config"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	desktopReleaseRepo     = "gluestick-sh/desktop"
	desktopReleaseAPIURL   = "https://api.github.com/repos/" + desktopReleaseRepo + "/releases/latest"
	desktopUpdateStateFile = "desktop-update-state.json"
	desktopUpdateRemindFor = 24 * time.Hour
	desktopUpdateHTTPTimeout = 15 * time.Second
)

// DesktopUpdateInfo is the result of checking GitHub for a newer Desktop release.
type DesktopUpdateInfo struct {
	UpdateAvailable bool   `json:"updateAvailable"`
	CurrentVersion  string `json:"currentVersion"`
	LatestVersion   string `json:"latestVersion"`
	ReleaseURL      string `json:"releaseURL"`
	DownloadURL     string `json:"downloadURL"`
	ReleaseNotes    string `json:"releaseNotes"`
	Manual          bool   `json:"manual"`
	Error           string `json:"error,omitempty"`
}

type desktopUpdateState struct {
	SkippedVersion string    `json:"skipped_version,omitempty"`
	RemindAfter    time.Time `json:"remind_after,omitempty"`
}

type githubReleaseResponse struct {
	TagName string `json:"tag_name"`
	HTMLURL string `json:"html_url"`
	Body    string `json:"body"`
	Assets  []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
	} `json:"assets"`
}

// CheckDesktopUpdate queries GitHub Releases for a newer Desktop build.
// When manual is false, skipped versions and remind-later are honored.
func (a *App) CheckDesktopUpdate(manual bool) DesktopUpdateInfo {
	result := DesktopUpdateInfo{
		CurrentVersion: Version,
		Manual:         manual,
	}
	latest, err := a.fetchLatestDesktopRelease()
	if err != nil {
		result.Error = err.Error()
		return result
	}
	result.LatestVersion = latest.version
	result.ReleaseURL = latest.releaseURL
	result.DownloadURL = latest.downloadURL
	result.ReleaseNotes = strings.TrimSpace(latest.notes)

	if compareSemver(Version, latest.version) >= 0 {
		return result
	}

	if !manual {
		state, err := a.loadDesktopUpdateState()
		if err != nil {
			result.Error = err.Error()
			return result
		}
		if state.SkippedVersion == latest.version {
			return result
		}
		if !state.RemindAfter.IsZero() && time.Now().Before(state.RemindAfter) {
			return result
		}
	}

	result.UpdateAvailable = true
	return result
}

// DismissDesktopUpdate records remind-later or skip for a release version.
func (a *App) DismissDesktopUpdate(action, version string) error {
	version = normalizeVersion(version)
	if version == "" {
		return fmt.Errorf("empty version")
	}
	state, err := a.loadDesktopUpdateState()
	if err != nil {
		return err
	}
	switch strings.TrimSpace(action) {
	case "remind_later":
		state.RemindAfter = time.Now().Add(desktopUpdateRemindFor)
	case "skip":
		state.SkippedVersion = version
		state.RemindAfter = time.Time{}
	default:
		return fmt.Errorf("unknown dismiss action: %s", action)
	}
	return a.saveDesktopUpdateState(state)
}

// OpenDesktopUpdateURL opens a release or installer download URL in the default browser.
func (a *App) OpenDesktopUpdateURL(url string) {
	url = strings.TrimSpace(url)
	if url == "" || a.ctx == nil {
		return
	}
	wailsruntime.BrowserOpenURL(a.ctx, url)
}

type fetchedDesktopRelease struct {
	version     string
	releaseURL  string
	downloadURL string
	notes       string
}

func (a *App) fetchLatestDesktopRelease() (fetchedDesktopRelease, error) {
	var lastErr error
	for _, url := range desktopReleaseCheckURLs(a.glueRootDir()) {
		release, err := fetchGitHubLatestRelease(url)
		if err != nil {
			lastErr = err
			continue
		}
		version := normalizeVersion(release.TagName)
		if version == "" {
			lastErr = fmt.Errorf("release has no version tag")
			continue
		}
		downloadURL := pickDesktopInstallerAsset(release.Assets, desktopInstallerArch())
		if downloadURL == "" && release.HTMLURL != "" {
			downloadURL = release.HTMLURL
		}
		return fetchedDesktopRelease{
			version:     version,
			releaseURL:  release.HTMLURL,
			downloadURL: downloadURL,
			notes:       release.Body,
		}, nil
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("unable to check for updates")
	}
	return fetchedDesktopRelease{}, lastErr
}

func desktopReleaseCheckURLs(glueRoot string) []string {
	return config.MirrorURLs(desktopReleaseAPIURL, config.LoadProxies(glueRoot))
}

func fetchGitHubLatestRelease(url string) (githubReleaseResponse, error) {
	client := &http.Client{Timeout: desktopUpdateHTTPTimeout}
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return githubReleaseResponse{}, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "Gluestick-Desktop/"+Version)

	resp, err := client.Do(req)
	if err != nil {
		return githubReleaseResponse{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return githubReleaseResponse{}, err
	}
	if resp.StatusCode != http.StatusOK {
		return githubReleaseResponse{}, fmt.Errorf("release check failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var release githubReleaseResponse
	if err := json.Unmarshal(body, &release); err != nil {
		return githubReleaseResponse{}, fmt.Errorf("parse release response: %w", err)
	}
	if strings.TrimSpace(release.TagName) == "" {
		return githubReleaseResponse{}, fmt.Errorf("release response missing tag_name")
	}
	return release, nil
}

func desktopInstallerArch() string {
	switch goruntime.GOARCH {
	case "arm64":
		return "arm64"
	default:
		return "amd64"
	}
}

func pickDesktopInstallerAsset(assets []struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}, arch string,
) string {
	want := fmt.Sprintf("GluestickDesktopSetup-%s.exe", arch)
	for _, asset := range assets {
		if strings.EqualFold(asset.Name, want) && strings.TrimSpace(asset.BrowserDownloadURL) != "" {
			return asset.BrowserDownloadURL
		}
	}
	for _, asset := range assets {
		name := strings.ToLower(asset.Name)
		if strings.HasSuffix(name, ".exe") && strings.Contains(name, arch) && strings.TrimSpace(asset.BrowserDownloadURL) != "" {
			return asset.BrowserDownloadURL
		}
	}
	return ""
}

func normalizeVersion(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "v")
	raw = strings.TrimPrefix(raw, "V")
	if idx := strings.IndexAny(raw, "-+"); idx >= 0 {
		raw = raw[:idx]
	}
	return strings.TrimSpace(raw)
}

func compareSemver(a, b string) int {
	av, okA := parseSemver(normalizeVersion(a))
	bv, okB := parseSemver(normalizeVersion(b))
	if !okA || !okB {
		return strings.Compare(normalizeVersion(a), normalizeVersion(b))
	}
	for i := 0; i < 3; i++ {
		if av[i] < bv[i] {
			return -1
		}
		if av[i] > bv[i] {
			return 1
		}
	}
	return 0
}

func parseSemver(v string) ([3]int, bool) {
	var out [3]int
	parts := strings.Split(v, ".")
	if len(parts) == 0 {
		return out, false
	}
	for i := 0; i < 3; i++ {
		if i >= len(parts) {
			break
		}
		n, err := strconv.Atoi(strings.TrimSpace(parts[i]))
		if err != nil {
			return out, false
		}
		out[i] = n
	}
	return out, true
}

func (a *App) desktopUpdateStatePath() (string, error) {
	root := a.glueRootDir()
	if root == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		root = filepath.Join(home, ".glue")
	}
	return filepath.Join(root, desktopUpdateStateFile), nil
}

func (a *App) loadDesktopUpdateState() (desktopUpdateState, error) {
	path, err := a.desktopUpdateStatePath()
	if err != nil {
		return desktopUpdateState{}, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return desktopUpdateState{}, nil
		}
		return desktopUpdateState{}, err
	}
	var state desktopUpdateState
	if err := json.Unmarshal(data, &state); err != nil {
		return desktopUpdateState{}, fmt.Errorf("read desktop update state: %w", err)
	}
	return state, nil
}

func (a *App) saveDesktopUpdateState(state desktopUpdateState) error {
	path, err := a.desktopUpdateStatePath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')
	return os.WriteFile(path, data, 0o644)
}
