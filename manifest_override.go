package main

// SetManifestDownloadOverride saves a user-edited download URL for a package ref.
func (a *App) SetManifestDownloadOverride(pkgRef, downloadURL string) error {
	if err := a.requireEngine(); err != nil {
		return err
	}
	urls := []string{}
	if downloadURL != "" {
		urls = []string{downloadURL}
	}
	return a.engine.SetManifestDownloadOverride(pkgRef, urls, nil)
}

// ClearManifestDownloadOverride removes a saved download URL override.
func (a *App) ClearManifestDownloadOverride(pkgRef string) error {
	if err := a.requireEngine(); err != nil {
		return err
	}
	return a.engine.ClearManifestDownloadOverride(pkgRef)
}

// SetManifestJSONOverride saves user-edited manifest JSON for a package ref.
func (a *App) SetManifestJSONOverride(pkgRef, jsonText string) error {
	if err := a.requireEngine(); err != nil {
		return err
	}
	return a.engine.SetManifestJSONOverrideForRef(a.ctx, pkgRef, jsonText)
}

// ClearManifestJSONOverride removes a saved manifest JSON override.
func (a *App) ClearManifestJSONOverride(pkgRef string) error {
	if err := a.requireEngine(); err != nil {
		return err
	}
	return a.engine.ClearManifestJSONOverride(pkgRef)
}
