package main

import "github.com/gluestick-sh/core/engine"

// InstallPlanItem is a dependency or suggestion entry for install planning.
type InstallPlanItem struct {
	Ref       string `json:"ref"`
	Label     string `json:"label,omitempty"`
	Installed bool   `json:"installed"`
}

// InstallPlan describes dependencies and suggestions before installing a package.
type InstallPlan struct {
	Package              string                `json:"package"`
	Depends              []InstallPlanItem     `json:"depends"`
	Suggestions          []InstallPlanItem     `json:"suggestions"`
	Manifest             InstallManifestInfo   `json:"manifest"`
	LocalActivateVersion string                `json:"localActivateVersion,omitempty"`
}

// PlanInstall resolves missing depends and manifest suggestions for name.
func (a *App) PlanInstall(name string) (*InstallPlan, error) {
	if err := a.requireEngine(); err != nil {
		return nil, err
	}
	plan, err := a.engine.PlanInstall(a.ctx, name)
	if err != nil {
		return nil, err
	}
	return convertInstallPlan(plan), nil
}

func convertInstallPlan(plan *engine.InstallPlan) *InstallPlan {
	if plan == nil {
		return nil
	}
	out := &InstallPlan{
		Package:              plan.Package,
		Depends:              make([]InstallPlanItem, len(plan.Depends)),
		Suggestions:          make([]InstallPlanItem, len(plan.Suggestions)),
		Manifest:             convertInstallManifestInfoValue(plan.Manifest),
		LocalActivateVersion: plan.LocalActivateVersion,
	}
	for i, d := range plan.Depends {
		out.Depends[i] = InstallPlanItem{Ref: d.Ref, Label: d.Label, Installed: d.Installed}
	}
	for i, s := range plan.Suggestions {
		out.Suggestions[i] = InstallPlanItem{Ref: s.Ref, Label: s.Label, Installed: s.Installed}
	}
	return out
}
