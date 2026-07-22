package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
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
// It shells out to the OS handler directly because wails' BrowserOpenURL fails to
// launch the default browser on some Windows setups ("Unable to open default system browser").
func (a *App) OpenDesktopUpdateURL(url string) {
	url = strings.TrimSpace(url)
	if a.ctx != nil {
		wailsruntime.LogInfo(a.ctx, fmt.Sprintf("OpenDesktopUpdateURL called: %q", url))
	}
	if url == "" {
		return
	}
	if err := openInBrowser(url); err != nil {
		if a.ctx != nil {
			wailsruntime.LogError(a.ctx, fmt.Sprintf("open update URL failed: %v", err))
			wailsruntime.BrowserOpenURL(a.ctx, url)
		}
		return
	}
	if a.ctx != nil {
		wailsruntime.LogInfo(a.ctx, "OpenDesktopUpdateURL launched browser handler")
	}
}

// openInBrowser launches the given URL using the platform's default handler.
func openInBrowser(url string) error {
	switch goruntime.GOOS {
	case "windows":
		// explorer hands the URL to ShellExecute, which resolves the default
		// browser association. Same mechanism used to open folders in the app,
		// and it avoids cmd's finicky "start" argument parsing.
		if err := exec.Command("explorer", url).Start(); err == nil {
			return nil
		}
		// Fallbacks for machines where ShellExecute via explorer fails with
		// "Application not found" (common when http/https handlers are broken).
		if err := exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start(); err == nil {
			return nil
		}
		return exec.Command("cmd", "/c", "start", "", url).Start()
	case "darwin":
		return exec.Command("open", url).Start()
	default:
		return exec.Command("xdg-open", url).Start()
	}
}

const desktopUpdateDownloadTimeout = 15 * time.Minute

// DownloadAndRunDesktopUpdate downloads the installer at url and launches it.
// It runs asynchronously and reports status via "desktop-update:download:*" events
// so the UI can show progress. This avoids relying on a default browser, which may
// not be configured on some machines.
func (a *App) DownloadAndRunDesktopUpdate(url string) {
	url = strings.TrimSpace(url)
	if url == "" {
		a.emitDesktopDownloadError("empty download url")
		return
	}
	go a.downloadAndRunDesktopUpdate(url)
}

func (a *App) downloadAndRunDesktopUpdate(url string) {
	a.emitDesktopDownloadEvent("desktop-update:download:start", map[string]any{})
	if a.ctx != nil {
		wailsruntime.LogInfo(a.ctx, "Downloading desktop update: "+url)
	}
	dest, err := a.downloadDesktopInstaller(url)
	if err != nil {
		if a.ctx != nil {
			wailsruntime.LogError(a.ctx, fmt.Sprintf("download desktop update failed: %v", err))
		}
		a.emitDesktopDownloadError(err.Error())
		return
	}
	if err := runInstaller(dest); err != nil {
		if a.ctx != nil {
			wailsruntime.LogError(a.ctx, fmt.Sprintf("launch installer failed: %v", err))
		}
		a.emitDesktopDownloadError(err.Error())
		return
	}
	if a.ctx != nil {
		wailsruntime.LogInfo(a.ctx, "Launched desktop update installer: "+dest)
	}
	a.emitDesktopDownloadEvent("desktop-update:download:complete", map[string]any{"path": dest})
}

func (a *App) downloadDesktopInstaller(url string) (string, error) {
	dest := filepath.Join(os.TempDir(), installerFileName(url))
	var lastErr error
	for _, candidate := range config.MirrorURLs(url, config.LoadProxies(a.glueRootDir())) {
		if err := a.downloadFileWithProgress(candidate, dest); err != nil {
			lastErr = err
			continue
		}
		return dest, nil
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("unable to download installer")
	}
	return "", lastErr
}

func (a *App) downloadFileWithProgress(url, dest string) error {
	client := &http.Client{Timeout: desktopUpdateDownloadTimeout}
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "Gluestick-Desktop/"+Version)

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed (%d)", resp.StatusCode)
	}

	tmp := dest + ".part"
	f, err := os.Create(tmp)
	if err != nil {
		return err
	}

	total := resp.ContentLength
	var received int64
	buf := make([]byte, 128*1024)
	lastEmit := time.Now()
	for {
		n, rerr := resp.Body.Read(buf)
		if n > 0 {
			if _, werr := f.Write(buf[:n]); werr != nil {
				f.Close()
				os.Remove(tmp)
				return werr
			}
			received += int64(n)
			if time.Since(lastEmit) >= 200*time.Millisecond {
				a.emitDesktopDownloadProgress(received, total)
				lastEmit = time.Now()
			}
		}
		if rerr == io.EOF {
			break
		}
		if rerr != nil {
			f.Close()
			os.Remove(tmp)
			return rerr
		}
	}
	if err := f.Close(); err != nil {
		os.Remove(tmp)
		return err
	}
	a.emitDesktopDownloadProgress(received, total)

	_ = os.Remove(dest)
	if err := os.Rename(tmp, dest); err != nil {
		os.Remove(tmp)
		return err
	}
	return nil
}

// installerFileName derives a safe local filename from the download URL.
func installerFileName(rawURL string) string {
	name := rawURL
	if idx := strings.IndexAny(name, "?#"); idx >= 0 {
		name = name[:idx]
	}
	if idx := strings.LastIndexAny(name, "/\\"); idx >= 0 {
		name = name[idx+1:]
	}
	name = strings.TrimSpace(name)
	if name == "" || !strings.HasSuffix(strings.ToLower(name), ".exe") {
		name = fmt.Sprintf("GluestickDesktopSetup-%s.exe", desktopInstallerArch())
	}
	return name
}

// runInstaller launches the downloaded installer.
func runInstaller(path string) error {
	if goruntime.GOOS != "windows" {
		return fmt.Errorf("installer launch is only supported on windows")
	}
	return exec.Command(path).Start()
}

func (a *App) emitDesktopDownloadEvent(event string, payload map[string]any) {
	if a.ctx != nil {
		wailsruntime.EventsEmit(a.ctx, event, payload)
	}
}

func (a *App) emitDesktopDownloadProgress(received, total int64) {
	percent := 0.0
	if total > 0 {
		percent = float64(received) / float64(total) * 100
		if percent > 100 {
			percent = 100
		}
	}
	a.emitDesktopDownloadEvent("desktop-update:download:progress", map[string]any{
		"received": received,
		"total":    total,
		"percent":  percent,
	})
}

func (a *App) emitDesktopDownloadError(msg string) {
	a.emitDesktopDownloadEvent("desktop-update:download:error", map[string]any{"error": msg})
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
