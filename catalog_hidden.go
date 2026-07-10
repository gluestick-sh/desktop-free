package main

// HideCatalogPackage hides a deprecated or unwanted package from catalog browse/search.
func (a *App) HideCatalogPackage(pkgRef string) error {
	if err := a.requireEngine(); err != nil {
		return err
	}
	return a.engine.HideCatalogPackage(pkgRef)
}
