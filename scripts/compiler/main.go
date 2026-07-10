// Command compiler is a drop-in "go" replacement for wails dev on Windows/arm64 + Go 1.26,
// where -gcflags "all=-N -l" triggers a nosplit stack compile error.
package main

import (
	"os"
	"os/exec"
)

func main() {
	args := os.Args[1:]
	filtered := make([]string, 0, len(args))
	for i := 0; i < len(args); i++ {
		if args[i] == "-gcflags" {
			i++
			continue
		}
		filtered = append(filtered, args[i])
	}

	cmd := exec.Command("go", filtered...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	cmd.Env = os.Environ()
	cmd.Dir, _ = os.Getwd()

	if err := cmd.Run(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		os.Exit(1)
	}
}
