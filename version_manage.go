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
// Viewing installed versions is available for free; switching/locking versions is Pro-gated.
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

// SwitchPackageVersion switches to a specified installed version (rollback).
func (a *App) SwitchPackageVersion(pkgName, version string) error {
	if err := a.requireProActive(); err != nil {
		return err
	}
	if err := a.requireEngine(); err != nil {
		return err
	}
	err := a.engine.SwitchPackageVersion(pkgName, version)
	if version != "" {
		a.emitActivityLogUpdated()
	}
	return err
}

// SetPackageVersionLock locks/unlocks a package version; when locked, skips upgrade checks
// and prevents implicit upgrades.
func (a *App) SetPackageVersionLock(pkgName string, locked bool) error {
	if err := a.requireProActive(); err != nil {
		return err
	}
	if err := a.requireEngine(); err != nil {
		return err
	}
	if err := a.engine.SetPackageVersionLock(pkgName, locked); err != nil {
		return err
	}
	a.emitActivityLogUpdated()
	return nil
}
