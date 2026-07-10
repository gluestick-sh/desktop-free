package main

// Shim runner copied beside gluestick.exe and seeded into ~/.glue/shim.exe.
// Each installed command gets a copy of this binary as its shim.

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type Config struct {
	Name    string            `json:"name"`
	Command string            `json:"command"`
	Args    []string          `json:"args,omitempty"`
	Env     map[string]string `json:"env,omitempty"`
	Path    string            `json:"path"`
}

func main() {
	shimName := filepath.Base(os.Args[0])
	shimName = strings.TrimSuffix(shimName, ".exe")

	home, err := os.UserHomeDir()
	if err != nil {
		fatal(err)
	}

	configPath := filepath.Join(home, ".glue", "shims-meta", shimName+".json")

	data, err := os.ReadFile(configPath)
	if err != nil {
		fatal(fmt.Errorf("shim config not found: %w", err))
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		fatal(fmt.Errorf("invalid shim config: %w", err))
	}

	args := append(cfg.Args, os.Args[1:]...)
	cmd := exec.Command(cfg.Command, args...)
	if len(cfg.Env) > 0 {
		env := os.Environ()
		for k, v := range cfg.Env {
			env = append(env, k+"="+v)
		}
		cmd.Env = env
	}

	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		fatal(err)
	}
}

func fatal(err error) {
	fmt.Fprintf(os.Stderr, "glue shim error: %v\n", err)
	os.Exit(1)
}
