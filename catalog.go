package main

import (
	"github.com/gluestick-sh/core/engine"
	"github.com/gluestick-sh/core/config"
)

// CatalogBucketInfo represents bucket categories in the software catalog
type CatalogBucketInfo struct {
	Name         string `json:"name"`
	Description  string `json:"description"`
	PackageCount int    `json:"packageCount"`
}

// CatalogPackageInfo represents installable packages in the software catalog
type CatalogPackageInfo struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	Description string `json:"description"`
	Bucket      string `json:"bucket"`
	Homepage    string `json:"homepage"`
	Deprecated  bool   `json:"deprecated"`
}

// CatalogBucketsQuery represents software catalog bucket list query
type CatalogBucketsQuery struct {
	HideDeprecated bool `json:"hideDeprecated"`
}

// CatalogPackageQuery represents software catalog package list query
type CatalogPackageQuery struct {
	Bucket         string `json:"bucket"`
	Query          string `json:"query"`
	Page           int    `json:"page"`
	PageSize       int    `json:"pageSize"`
	HideDeprecated bool   `json:"hideDeprecated"`
}

// CatalogPackagePage represents software catalog package pagination result
type CatalogPackagePage struct {
	Items    []CatalogPackageInfo `json:"items"`
	Total    int                  `json:"total"`
	Page     int                  `json:"page"`
	PageSize int                  `json:"pageSize"`
}

// CatalogResolveRequest represents package reference resolution in templates
type CatalogResolveRequest struct {
	Name   string `json:"name"`
	Bucket string `json:"bucket"`
}

func mapCatalogPackage(pkg *engine.Package) CatalogPackageInfo {
	if pkg == nil {
		return CatalogPackageInfo{}
	}
	desc := pkg.Description
	homepage := pkg.Homepage
	if pkg.Manifest != nil {
		if desc == "" {
			desc = pkg.Manifest.Description
		}
		if homepage == "" {
			homepage = pkg.Manifest.Homepage
		}
	}
	return CatalogPackageInfo{
		Name:        pkg.Name,
		Version:     pkg.Version,
		Description: desc,
		Bucket:      pkg.Bucket,
		Homepage:    homepage,
		Deprecated:  pkg.Deprecated,
	}
}

// GetCatalogBuckets returns installed buckets and their package counts in the index
func (a *App) GetCatalogBuckets(query CatalogBucketsQuery) ([]CatalogBucketInfo, error) {
	if err := a.requireEngine(); err != nil {
		return nil, err
	}
	summaries := a.engine.CatalogBuckets(engine.CatalogBucketsQuery{
		HideDeprecated: query.HideDeprecated,
	})
	customDescriptions, _ := config.ReadConfigBucketDescriptions(a.glueRootDir())
	out := make([]CatalogBucketInfo, 0, len(summaries))
	for _, s := range summaries {
		desc := s.Description
		if custom, ok := customDescriptions[s.Name]; ok && custom != "" {
			desc = custom
		}
		out = append(out, CatalogBucketInfo{
			Name:         s.Name,
			Description:  desc,
			PackageCount: s.PackageCount,
		})
	}
	return out, nil
}

// ListCatalogPackages lists software catalog packages with pagination, can filter by bucket
func (a *App) ListCatalogPackages(query CatalogPackageQuery) (*CatalogPackagePage, error) {
	if err := a.requireEngine(); err != nil {
		return nil, err
	}
	page, err := a.engine.ListCatalogPackages(engine.CatalogPackageQuery{
		Bucket:         query.Bucket,
		Query:          query.Query,
		Page:           query.Page,
		PageSize:       query.PageSize,
		HideDeprecated: query.HideDeprecated,
	})
	if err != nil {
		return nil, err
	}
	items := make([]CatalogPackageInfo, 0, len(page.Items))
	for _, pkg := range page.Items {
		items = append(items, mapCatalogPackage(pkg))
	}
	return &CatalogPackagePage{
		Items:    items,
		Total:    page.Total,
		Page:     page.Page,
		PageSize: page.PageSize,
	}, nil
}

// ResolveCatalogPackages resolves template package names, returns package information existing in the index
func (a *App) ResolveCatalogPackages(requests []CatalogResolveRequest) ([]CatalogPackageInfo, error) {
	if err := a.requireEngine(); err != nil {
		return nil, err
	}
	reqs := make([]engine.CatalogResolveRequest, 0, len(requests))
	for _, r := range requests {
		reqs = append(reqs, engine.CatalogResolveRequest{
			Name:   r.Name,
			Bucket: r.Bucket,
		})
	}
	packages := a.engine.ResolveCatalogPackages(reqs)
	out := make([]CatalogPackageInfo, 0, len(packages))
	for _, pkg := range packages {
		out = append(out, mapCatalogPackage(pkg))
	}
	return out, nil
}
