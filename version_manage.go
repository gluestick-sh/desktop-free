package main

// PackageVersionEntry represents a single installed version
type PackageVersionEntry struct {
	Version string `json:"version"`
	Active  bool   `json:"active"`
}

// PackageVersionsInfo represents multi-version information for a package
type PackageVersionsInfo struct {
	Name          string                `json:"name"`
	ActiveVersion string                `json:"activeVersion"`
	VersionLocked bool                  `json:"versionLocked"`
	Versions      []PackageVersionEntry `json:"versions"`
}

// GetPackageVersions returns all installed versions of the specified package.
// Viewing installed versions is available for free; switching/removing versions is Pro-only.
func (a *App) GetPackageVersions(pkgName string) (*PackageVersionsInfo, error) {
	if err := a.requireEngine(); err != nil {
		return nil, err
	}
	info, err := a.engine.GetPackageVersions(pkgName)
	if err != nil {
		return nil, err
	}
	versions := make([]PackageVersionEntry, len(info.Versions))
	for i, v := range info.Versions {
		versions[i] = PackageVersionEntry{
			Version: v.Version,
			Active:  v.Active,
		}
	}
	return &PackageVersionsInfo{
		Name:          info.Name,
		ActiveVersion: info.ActiveVersion,
		VersionLocked: info.VersionLocked,
		Versions:      versions,
	}, nil
}

// SwitchPackageVersion switches to specified installed version (Pro-only).
func (a *App) SwitchPackageVersion(pkgName, version string) error {
	return a.requireProActive()
}

// SetPackageVersionLock locks/unlocks version (Pro-only).
func (a *App) SetPackageVersionLock(pkgName string, locked bool) error {
	return a.requireProActive()
}
