package main

import (
	"fmt"
	"strings"

	"github.com/gluestick-sh/core/config"
)

// GitHubProxyConfig represents GitHub proxy configuration (exposed to frontend)
type GitHubProxyConfig struct {
	Value       string `json:"value"`
	EnvOverride string `json:"envOverride,omitempty"`
	ConfigPath  string `json:"configPath"`
}

// GetGitHubProxy reads github_proxy from config.json (consistent with glue config get)
func (a *App) GetGitHubProxy() (*GitHubProxyConfig, error) {
	root := a.glueRootDir()
	if root == "" {
		return nil, errGlueRootUnavailable()
	}
	value, err := config.ReadConfigGitHubProxy(root)
	if err != nil {
		return nil, err
	}
	return &GitHubProxyConfig{
		Value:       value,
		EnvOverride: strings.TrimSpace(config.EnvGitHubProxy()),
		ConfigPath:  config.ConfigPath(root),
	}, nil
}

// SetGitHubProxy sets or clears github_proxy (empty string equivalent to glue config unset)
func (a *App) SetGitHubProxy(value string) error {
	root := a.glueRootDir()
	if root == "" {
		return errGlueRootUnavailable()
	}
	value = strings.TrimSpace(value)
	if err := config.WriteConfigGitHubProxy(root, value); err != nil {
		return err
	}
	a.mu.Lock()
	eng := a.engine
	a.mu.Unlock()
	if eng != nil {
		eng.ReloadGitHubProxies()
	}
	return nil
}

func errGlueRootUnavailable() error {
	return fmt.Errorf("glue root directory unavailable")
}
