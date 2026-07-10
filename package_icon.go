package main

import (
	"encoding/base64"
	"fmt"

	"gluestick.sh/desktop/internal/winicon"
)

// GetPackageIcon returns a base64-encoded PNG of the package's executable icon, or empty if unavailable.
func (a *App) GetPackageIcon(name string) (string, error) {
	if err := a.requireEngine(); err != nil {
		return "", err
	}

	detail, err := a.engine.GetInstalledPackageDetail(name)
	if err != nil {
		return "", err
	}
	cacheKey := name + "@" + detail.Version
	if v, ok := a.packageIconCache.Load(cacheKey); ok {
		return v.(string), nil
	}

	iconPath, err := a.engine.PackageIconPath(name)
	if err != nil {
		return "", err
	}
	if iconPath == "" {
		return "", nil
	}

	png, err := winicon.FileIconPNG(iconPath)
	if err != nil {
		return "", fmt.Errorf("extract icon from %s: %w", iconPath, err)
	}
	if len(png) == 0 {
		return "", nil
	}

	encoded := base64.StdEncoding.EncodeToString(png)
	a.packageIconCache.Store(cacheKey, encoded)
	return encoded, nil
}
